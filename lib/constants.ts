export const appColor = {
  neonCyanBlue: '#00B4FF',
  jetBlack: '#000000',
  skyBlue: '#33C3FF',
  lightBlue: '#CAEFFF',
};

export const NAV_THEME = {
  light: {
    background: appColor.jetBlack, // background
    border: 'hsl(240 5.9% 90%)', // border
    card: 'hsl(0 0% 100%)', // card
    notification: 'hsl(0 84.2% 60.2%)', // destructive
    primary: 'hsl(240 5.9% 10%)', // primary
    text: appColor.neonCyanBlue, // foreground
  },
  dark: {
    background: appColor.jetBlack, // background
    border: 'hsl(240 3.7% 15.9%)', // border
    card: 'hsl(240 10% 3.9%)', // card
    notification: 'hsl(0 72% 51%)', // destructive
    primary: 'hsl(0 0% 98%)', // primary
    text: appColor.neonCyanBlue, // foreground
  },
};
