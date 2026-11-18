export interface Theme {
  background: number;
  floor: number;
  gridMinor: number;
  gridMajor: number;
  border: number;
  hoverFill: number;
  hoverStroke: number;
}

export const lightTheme: Theme = {
  background: 0xf2f2f0,
  floor: 0xffffff,
  gridMinor: 0xe6e6e6,
  gridMajor: 0xcfcfcf,
  border: 0xb4b4b4,
  hoverFill: 0x2f6bff,
  hoverStroke: 0x2f6bff,
};
