import styles from './userRole.module.css';  // Import the CSS module
import { SearchUsers } from './SearchUsers'
import { clerkClient } from '@clerk/nextjs/server'
import { removeRole, setRole } from './_actions'

export default async function AdminDashboard(params) {
  const {searchParams} = await params
  const query = searchParams.search;
  const users = (await (await clerkClient()).users.getUserList({ query })).data;

  return (
    <div className={styles.container}>
      <p className={styles.heading}>User Role Management</p>

      <SearchUsers />

      {users.map((user) => {
        return (
          <div key={user.id} className={styles.userCard}>
            <div className={styles.userDetails}>
              <div className={styles.userName}><strong>{user.firstName} {user.lastName}</strong></div>
              <div className={styles.userEmail}>
                {user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress}
              </div>
              <div className={styles.userRole}><strong>Role:</strong> {user.publicMetadata.role}</div>
            </div>

            <div className={styles.formGroup}>
              <form action={setRole}>
                <input type="hidden" value={user.id} name="id" />
                <input type="hidden" value="admin" name="role" />
                <button type="submit" className={styles.button}>Make Admin</button>
              </form>

              <form action={setRole}>
                <input type="hidden" value={user.id} name="id" />
                <input type="hidden" value="developer" name="role" />
                <button type="submit" className={styles.button}>Make Developer</button>
              </form>

              <form action={setRole}>
                <input type="hidden" value={user.id} name="id" />
                <input type="hidden" value="marketing" name="role" />
                <button type="submit" className={styles.button}>Make Marketing</button>
              </form>
              <form action={setRole}>
                <input type="hidden" value={user.id} name="id" />
                <input type="hidden" value="designer" name="role" />
                <button type="submit" className={styles.button}>Make Designer</button>
              </form>
              <form action={setRole}>
                <input type="hidden" value={user.id} name="id" />
                <input type="hidden" value="production" name="role" />
                <button type="submit" className={styles.button}>Make Production</button>
              </form>
              <form action={setRole}>
                <input type="hidden" value={user.id} name="id" />
                <input type="hidden" value="finance" name="role" />
                <button type="submit" className={styles.button}>Make Finance</button>
              </form>

              <form action={removeRole}>
                <input type="hidden" value={user.id} name="id" />
                <button type="submit" className={`${styles.button} ${styles.removeButton}`}>Remove Role</button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
