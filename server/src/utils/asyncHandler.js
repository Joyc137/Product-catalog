// Express 4 does not forward rejected promises to error middleware; this does.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
