const mockShare = {
  open: jest.fn(),
  shareSingle: jest.fn(),
  isPackageInstalled: jest.fn(),
};

module.exports = mockShare;
module.exports.default = mockShare;
