'use server';

import { adminAuth } from "@/lib/firebaseAdmin";

async function verifyAdminPermission(clientToken) {
  if (!clientToken) throw new Error("Unauthorized");

  try {
    const decodedToken = await adminAuth.verifyIdToken(clientToken);
    if (decodedToken.admin !== true) throw new Error("Forbidden");
    return decodedToken;
  } catch {
    throw new Error("Authentication failed or administrator access is required");
  }
}

function toUserRow(user) {
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName || "",
    photoURL: user.photoURL ?? "",
    emailVerified: Boolean(user.emailVerified),
    disabled: Boolean(user.disabled),
    creationTime: user.metadata?.creationTime ?? null,
    lastSignInTime: user.metadata?.lastSignInTime ?? null,
    providers: (user.providerData ?? []).map((provider) => provider.providerId),
    isAdmin: user.customClaims?.admin === true,
  };
}

export async function getAllUsers(clientToken) {
  await verifyAdminPermission(clientToken);

  try {
    const result = await adminAuth.listUsers(1000);
    return result.users.map(toUserRow);
  } catch {
    throw new Error("Failed to fetch users");
  }
}

async function countOtherAdmins(excludedUid) {
  const result = await adminAuth.listUsers(1000);
  return result.users.filter(
    (user) => user.uid !== excludedUid && user.customClaims?.admin === true
  ).length;
}

export async function updateUserProfile(clientToken, targetUid, changes) {
  const caller = await verifyAdminPermission(clientToken);
  if (!targetUid || !changes || typeof changes !== "object") {
    throw new Error("Invalid update request");
  }
  if (targetUid === caller.uid && Object.hasOwn(changes, "disabled") && changes.disabled === true) {
    throw new Error("You cannot disable your own account from this panel");
  }

  const allowed = {};
  if (Object.hasOwn(changes, "displayName")) {
    if (typeof changes.displayName !== "string" || changes.displayName.trim().length > 100) {
      throw new Error("Display name must be 100 characters or fewer");
    }
    allowed.displayName = changes.displayName.trim();
  }
  if (Object.hasOwn(changes, "email")) {
    if (typeof changes.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email.trim())) {
      throw new Error("Enter a valid email address");
    }
    allowed.email = changes.email.trim();
  }
  if (Object.hasOwn(changes, "disabled")) {
    if (typeof changes.disabled !== "boolean") throw new Error("Invalid account status");
    allowed.disabled = changes.disabled;
  }

  if (Object.keys(allowed).length === 0) throw new Error("No supported changes provided");

  try {
    await adminAuth.updateUser(targetUid, allowed);
    return { success: true };
  } catch (error) {
    if (error?.code === "auth/email-already-exists") {
      throw new Error("That email address is already in use");
    }
    if (error?.code === "auth/user-not-found") throw new Error("User not found");
    throw new Error(error?.message || "Failed to update user");
  }
}

export async function toggleAdminStatus(clientToken, targetUid, makeAdmin) {
  const caller = await verifyAdminPermission(clientToken);
  if (!targetUid || typeof makeAdmin !== "boolean") throw new Error("Invalid admin update");

  if (targetUid === caller.uid && makeAdmin === false) {
    const remainingAdmins = await countOtherAdmins(caller.uid);
    if (remainingAdmins === 0) throw new Error("You cannot remove the last administrator");
  }

  try {
    const target = await adminAuth.getUser(targetUid);
    const existingClaims = target.customClaims ?? {};

    if (makeAdmin === false && existingClaims.admin === true) {
      const remainingAdmins = await countOtherAdmins(targetUid);
      if (remainingAdmins === 0) throw new Error("You cannot remove the last administrator");
    }

    await adminAuth.setCustomUserClaims(targetUid, {
      ...existingClaims,
      admin: makeAdmin,
    });
    return { success: true };
  } catch (error) {
    if (error?.message === "You cannot remove the last administrator") throw error;
    throw new Error("Failed to update administrator permissions");
  }
}

export async function deleteUserAccount(clientToken, targetUid) {
  const caller = await verifyAdminPermission(clientToken);
  if (!targetUid) throw new Error("Invalid user ID");
  if (targetUid === caller.uid) throw new Error("You cannot delete your own account from this panel");

  try {
    const target = await adminAuth.getUser(targetUid);
    if (target.customClaims?.admin === true) {
      const remainingAdmins = await countOtherAdmins(targetUid);
      if (remainingAdmins === 0) throw new Error("You cannot delete the last administrator");
    }

    await adminAuth.deleteUser(targetUid);
    return { success: true };
  } catch (error) {
    if (error?.message === "You cannot delete the last administrator") throw error;
    if (error?.code === "auth/user-not-found") throw new Error("User not found");
    throw new Error("Failed to delete user account");
  }
}
