const versionController = {
  getVersion: async (req, res) => {
    res.status(200).json({
      status: true,
      data: {
        android: "1.0.0",
        ios: "1.0.0",
      },
    });
  },
};

module.exports = versionController;
