import * as SecureStore from 'expo-secure-store';

export const saveToken = async (token) => await SecureStore.setItemAsync('kribigo_token', token);
export const getToken = async () => await SecureStore.getItemAsync('kribigo_token');
export const savePhone = async (phone) => await SecureStore.setItemAsync('kribigo_phone', phone);
export const getPhone = async () => await SecureStore.getItemAsync('kribigo_phone');
export const saveRole = async (role) => await SecureStore.setItemAsync('kribigo_role', role);
export const getRole = async () => await SecureStore.getItemAsync('kribigo_role');
export const clearAll = async () => {
  await SecureStore.deleteItemAsync('kribigo_token');
  await SecureStore.deleteItemAsync('kribigo_phone');
  await SecureStore.deleteItemAsync('kribigo_role');
};
