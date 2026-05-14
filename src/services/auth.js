import { saveToken, savePhone, saveRole, getToken, getPhone, getRole, saveUserId, getUserId, clearAll } from './storage';

export const persistLogin = async (token, phone, role, userId) => {
  await saveToken(token);
  await savePhone(phone);
  await saveRole(role);
  if (userId) await saveUserId(userId);
};

export const loadSession = async () => {
  const token = await getToken();
  const phone = await getPhone();
  const role = await getRole();
  const userId = await getUserId();
  if (token && phone && role) return { token, phone, role, userId };
  return null;
};

export const logout = async () => await clearAll();
