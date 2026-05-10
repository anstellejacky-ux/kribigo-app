import { saveToken, savePhone, saveRole, getToken, getPhone, getRole, clearAll } from './storage';

export const persistLogin = async (token, phone, role) => {
  await saveToken(token);
  await savePhone(phone);
  await saveRole(role);
};

export const loadSession = async () => {
  const token = await getToken();
  const phone = await getPhone();
  const role = await getRole();
  if (token && phone && role) return { token, phone, role };
  return null;
};

export const logout = async () => await clearAll();
