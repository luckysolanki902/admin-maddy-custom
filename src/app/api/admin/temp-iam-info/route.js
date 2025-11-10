// /api/admin/temp-iam-info/route.js
import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';

export async function GET(request) {
  const permissionTests = {
    iam: {},
    s3: {},
    sts: {}
  };
  
  let accountId = null;
  let username = null;
  let userArn = null;

  try {
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-south-1',
    });

    // Try STS GetCallerIdentity (almost always works, doesn't need special permissions)
    const sts = new AWS.STS();
    try {
      const identity = await sts.getCallerIdentity().promise();
      accountId = identity.Account;
      userArn = identity.Arn;
      username = identity.Arn.split('/').pop();
      permissionTests.sts.getCallerIdentity = { success: true, data: identity };
    } catch (error) {
      permissionTests.sts.getCallerIdentity = { success: false, error: error.message };
    }

    const iam = new AWS.IAM();

    // Test IAM GetUser
    let currentUser;
    try {
      currentUser = await iam.getUser().promise();
      permissionTests.iam.getUser = { success: true };
      if (!accountId && currentUser.User.Arn) {
        accountId = currentUser.User.Arn.split(':')[4];
      }
    } catch (error) {
      permissionTests.iam.getUser = { success: false, error: error.message, code: error.code };
    }

    // Test IAM ListUsers
    let users;
    try {
      users = await iam.listUsers().promise();
      permissionTests.iam.listUsers = { success: true, count: users.Users.length };
    } catch (error) {
      permissionTests.iam.listUsers = { success: false, error: error.message, code: error.code };
    }

    // Test IAM GetAccountSummary
    let accountSummary;
    try {
      accountSummary = await iam.getAccountSummary().promise();
      permissionTests.iam.getAccountSummary = { success: true };
    } catch (error) {
      permissionTests.iam.getAccountSummary = { success: false, error: error.message, code: error.code };
    }

    // Test S3 ListBuckets
    const s3 = new AWS.S3();
    try {
      const buckets = await s3.listBuckets().promise();
      permissionTests.s3.listBuckets = { 
        success: true, 
        count: buckets.Buckets.length,
        buckets: buckets.Buckets.map(b => b.Name)
      };
    } catch (error) {
      permissionTests.s3.listBuckets = { success: false, error: error.message, code: error.code };
    }

    // Test S3 access to specific bucket
    const bucketName = process.env.AWS_BUCKET;
    if (bucketName) {
      try {
        await s3.headBucket({ Bucket: bucketName }).promise();
        permissionTests.s3.accessSpecificBucket = { 
          success: true, 
          bucket: bucketName 
        };
        
        // Try to list objects in the bucket
        try {
          const objects = await s3.listObjectsV2({ 
            Bucket: bucketName, 
            MaxKeys: 10 
          }).promise();
          permissionTests.s3.listObjects = { 
            success: true, 
            bucket: bucketName,
            objectCount: objects.Contents?.length || 0
          };
        } catch (error) {
          permissionTests.s3.listObjects = { 
            success: false, 
            bucket: bucketName,
            error: error.message, 
            code: error.code 
          };
        }
      } catch (error) {
        permissionTests.s3.accessSpecificBucket = { 
          success: false, 
          bucket: bucketName,
          error: error.message, 
          code: error.code 
        };
      }
    }

    // Compile detailed user information if we have access
    let userDetails = [];
    if (users?.Users) {
      userDetails = await Promise.all(
        users.Users.map(async (user) => {
          try {
            const attachedPolicies = await iam
              .listAttachedUserPolicies({ UserName: user.UserName })
              .promise();

            const inlinePolicies = await iam
              .listUserPolicies({ UserName: user.UserName })
              .promise();

            const groups = await iam
              .listGroupsForUser({ UserName: user.UserName })
              .promise();

            const accessKeys = await iam
              .listAccessKeyMetadata({ UserName: user.UserName })
              .promise();

            const policyDetails = await Promise.all(
              attachedPolicies.AttachedPolicies.map(async (policy) => {
                try {
                  const policyVersion = await iam
                    .getPolicy({ PolicyArn: policy.PolicyArn })
                    .promise();
                  const policyDoc = await iam
                    .getPolicyVersion({
                      PolicyArn: policy.PolicyArn,
                      VersionId: policyVersion.Policy.DefaultVersionId,
                    })
                    .promise();

                  return {
                    PolicyName: policy.PolicyName,
                    PolicyArn: policy.PolicyArn,
                    Document: policyDoc.PolicyVersion.Document,
                  };
                } catch (error) {
                  return {
                    PolicyName: policy.PolicyName,
                    PolicyArn: policy.PolicyArn,
                    Error: error.message,
                  };
                }
              })
            );

            const inlinePolicyDocs = await Promise.all(
              inlinePolicies.PolicyNames.map(async (policyName) => {
                try {
                  const policy = await iam
                    .getUserPolicy({
                      UserName: user.UserName,
                      PolicyName: policyName,
                    })
                    .promise();
                  return {
                    PolicyName: policyName,
                    Document: policy.PolicyDocument,
                  };
                } catch (error) {
                  return {
                    PolicyName: policyName,
                    Error: error.message,
                  };
                }
              })
            );

            return {
              UserName: user.UserName,
              UserId: user.UserId,
              Arn: user.Arn,
              CreateDate: user.CreateDate,
              PasswordLastUsed: user.PasswordLastUsed,
              AttachedPolicies: policyDetails,
              InlinePolicies: inlinePolicyDocs,
              Groups: groups.Groups.map((g) => ({
                GroupName: g.GroupName,
                GroupId: g.GroupId,
                Arn: g.Arn,
              })),
              AccessKeys: accessKeys.AccessKeyMetadata.map((key) => ({
                AccessKeyId: key.AccessKeyId,
                Status: key.Status,
                CreateDate: key.CreateDate,
              })),
            };
          } catch (error) {
            return {
              UserName: user.UserName,
              Error: error.message,
            };
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      accountId: accountId,
      username: username,
      userArn: userArn,
      currentUser: currentUser?.User || null,
      totalUsers: users?.Users?.length || 0,
      accountSummary: accountSummary?.SummaryMap || null,
      users: userDetails,
      permissionTests: permissionTests,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...',
        region: process.env.AWS_REGION || 'ap-south-1',
        bucket: process.env.AWS_BUCKET
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching IAM info:', error);
    return NextResponse.json(
      {
        success: false,
        accountId: accountId,
        username: username,
        userArn: userArn,
        permissionTests: permissionTests,
        error: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
