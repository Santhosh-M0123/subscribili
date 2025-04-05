
export const auth = async (req,res, next) => {
    try {
        req.user = {id: 1};
        next();
    } catch (error) {
        next(error);
    }
}