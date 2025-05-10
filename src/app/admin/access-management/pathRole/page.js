"use client";
import { useState, useEffect } from "react";
import styles from "./pathRole.module.css"; // Import CSS file for styling

export default function AccessControlPage() {
  const [paths, setPaths] = useState([]);
  const [newPath, setNewPath] = useState({ pathname: "", rolesAllowed: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [updateRolesForm, setUpdateRolesForm] = useState({
    pathname: "",
    rolesAllowed: [],
  });

  useEffect(() => {
    // Fetch all paths on load
    async function fetchPaths() {
      const res = await fetch("/api/authentication/paths");
      const data = await res.json();
      setPaths(data);
    }
    fetchPaths();
  }, []);

  // Add new path handler
  const handleAddPath = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await fetch("/api/authentication/paths/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathname: newPath.pathname,
        rolesAllowed: newPath.rolesAllowed,
      }),
    });

    const data = await res.json();
    setPaths((prev) => [...prev, data]);
    setNewPath({ pathname: "", rolesAllowed: [] });
    setIsLoading(false);
  };

  // Update roles handler
  const handleUpdateRoles = async () => {
    setIsLoading(true);

    await fetch("/api/authentication/paths/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathname: updateRolesForm.pathname,
        rolesAllowed: updateRolesForm.rolesAllowed,
      }),
    });

    const updatedPaths = paths.map((path) =>
      path.pathname === updateRolesForm.pathname
        ? { ...path, rolesAllowed: updateRolesForm.rolesAllowed }
        : path
    );

    setPaths(updatedPaths);
    setUpdateRolesForm({ pathname: "", rolesAllowed: [] });
    setIsLoading(false);
  };

  // Delete path handler
  const handleDeletePath = async (pathname) => {
    setIsLoading(true);

    await fetch("/api/authentication/paths/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname }),
    });

    setPaths(paths.filter((path) => path.pathname !== pathname));
    setIsLoading(false);
  };

  // Toggle role selection
  const handleRoleChange = (role) => {
    setUpdateRolesForm((prev) => {
      const newRoles = prev.rolesAllowed.includes(role)
        ? prev.rolesAllowed.filter((r) => r !== role)
        : [...prev.rolesAllowed, role];
      return { ...prev, rolesAllowed: newRoles };
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Manage Access Control</h1>

      <form onSubmit={handleAddPath} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>Pathname:</label>
          <input
            type="text"
            value={newPath.pathname}
            onChange={(e) => setNewPath({ ...newPath, pathname: e.target.value })}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Roles:</label>
          <div className={styles.roleCheckboxes}>
            <label>
              <input
                type="checkbox"
                style={{marginRight:'5px'}}
                checked={newPath.rolesAllowed.includes("admin")}
                onChange={() =>
                  setNewPath({
                    ...newPath,
                    rolesAllowed: newPath.rolesAllowed.includes("admin")
                      ? newPath.rolesAllowed.filter((r) => r !== "admin")
                      : [...newPath.rolesAllowed, "admin"],
                  })
                }
              />
              Admin
            </label>
            <label>
              <input
                type="checkbox"
                style={{marginRight:'5px'}}
                checked={newPath.rolesAllowed.includes("developer")}
                onChange={() =>
                  setNewPath({
                    ...newPath,
                    rolesAllowed: newPath.rolesAllowed.includes("developer")
                      ? newPath.rolesAllowed.filter((r) => r !== "developer")
                      : [...newPath.rolesAllowed, "developer"],
                  })
                }
              />
              Developer
            </label>
            <label>
              <input
                type="checkbox"
                style={{marginRight:'5px'}}
                checked={newPath.rolesAllowed.includes("marketing")}
                onChange={() =>
                  setNewPath({
                    ...newPath,
                    rolesAllowed: newPath.rolesAllowed.includes("marketing")
                      ? newPath.rolesAllowed.filter((r) => r !== "marketing")
                      : [...newPath.rolesAllowed, "marketing"],
                  })
                }
              />
              Marketing
            </label>
            <label>
              <input
                type="checkbox"
                style={{marginRight:'5px'}}
                checked={newPath.rolesAllowed.includes("designer")}
                onChange={() =>
                  setNewPath({
                    ...newPath,
                    rolesAllowed: newPath.rolesAllowed.includes("designer")
                      ? newPath.rolesAllowed.filter((r) => r !== "designer")
                      : [...newPath.rolesAllowed, "designer"],
                  })
                }
              />
              Designer
            </label>
            <label>
              <input
                type="checkbox"
                style={{marginRight:'5px'}}
                checked={newPath.rolesAllowed.includes("finance")}
                onChange={() =>
                  setNewPath({
                    ...newPath,
                    rolesAllowed: newPath.rolesAllowed.includes("finance")
                      ? newPath.rolesAllowed.filter((r) => r !== "finance")
                      : [...newPath.rolesAllowed, "finance"],
                  })
                }
              />
              Finance
            </label>
            <label>
              <input
                type="checkbox"
                style={{marginRight:'5px'}}
                checked={newPath.rolesAllowed.includes("production")}
                onChange={() =>
                  setNewPath({
                    ...newPath,
                    rolesAllowed: newPath.rolesAllowed.includes("production")
                      ? newPath.rolesAllowed.filter((r) => r !== "production")
                      : [...newPath.rolesAllowed, "production"],
                  })
                }
              />
              Production
            </label>
          </div>
        </div>
        <button type="submit" disabled={isLoading} className={styles.submitButton}>
          Add Path
        </button>
      </form>

      <h2>Existing Paths</h2>
      <ul className={styles.pathList}>
        {paths.map((path) => (
          <li key={path.pathname} className={styles.pathItem}>
            <div className={styles.pathName}>
              <strong>{path.pathname}</strong>
            </div>
            <div className={styles.roles}>
              <strong>Roles:</strong>
              <span>{path.rolesAllowed.join(", ")}</span>
            </div>
            <div className={styles.buttons}>
              <button
                onClick={() => setUpdateRolesForm({ pathname: path.pathname, rolesAllowed: path.rolesAllowed })}
                className={styles.updateButton}
              >
                Update Roles
              </button>
              <button
                onClick={() => handleDeletePath(path.pathname)}
                className={styles.deleteButton}
              >
                Delete Path
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Update Roles Modal */}
      {updateRolesForm.pathname && (
        <div className={styles.modal}>
          <h3 style={{marginBottom:'10px',fontSize:'20px'}}>Update Roles for {updateRolesForm.pathname}</h3>
          <div className={styles.roleCheckboxes}>
            {["admin", "developer", "marketing", "designer","production","finance"].map((role) => (
              <label key={role}>
                <input
                  type="checkbox"
                  style={{marginRight:'5px'}}
                  checked={updateRolesForm.rolesAllowed.includes(role)}
                  onChange={() => handleRoleChange(role)}
                />
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </label>
            ))}
          </div>
          <button onClick={handleUpdateRoles} className={styles.submitButton}>
            Update Roles
          </button>
          <button
            onClick={() => setUpdateRolesForm({ pathname: "", rolesAllowed: [] })}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
