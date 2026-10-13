export const sendResponse = (res, data) => {
  const responseData = {
    statusCode: data.statusCode,
    success: data.success,
    message: data.message || null,
    data: data.data || null,
  };

  if (data.stats !== undefined && data.stats !== null) {
    responseData.stats = data.stats;
  }

  if (data.meta !== undefined && data.meta !== null) {
    responseData.meta = data.meta;
  }

  res.status(data.statusCode).json(responseData);
};
