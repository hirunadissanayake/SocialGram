export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabsParamList = {
  Feed: undefined;
  Friends: undefined;
  Create: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  AppTabs: undefined;
  Chat: {
    friendId: string;
    friendName: string;
  };
};
