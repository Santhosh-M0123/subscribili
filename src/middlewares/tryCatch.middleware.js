
//HOF to handle the promises of the controllers
export const tryCatch = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
  