declare const jest: any;

const Geolocation = {
  getCurrentPosition: jest.fn((success: (arg0: { coords: { latitude: number; longitude: number; }; timestamp: number; }) => void, error: any) => {
    const position = {
      coords: {
        latitude: -6.2,
        longitude: 106.816666,
      },
      timestamp: Date.now(),
    };
    success(position);
  }),
  requestAuthorization: jest.fn(() => Promise.resolve('granted')),
};

export default Geolocation;
