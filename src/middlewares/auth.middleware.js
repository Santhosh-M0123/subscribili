
export const auth = async (req,res, next) => {
    try {
        req.user = {id: 2};
        next();
    } catch (error) {
        next(error);
    }
}