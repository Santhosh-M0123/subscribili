import { AppError } from "./appError.middleware.js";

export const ErrorHandler = async (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: false,
            message: err.message,
            type: "error",
            data: null,
            comment:
                err.statusCode == 401
                    ? "The request you made is unauthorized. This request has been reported to the admin."
                    : err.statusCode == 500
                    ? "Unhandled issues occurred. The request has been captured and reported to the admin."
                    : null,
            error: process.env.NODE_ENV === "PRODUCTION" ? null : err.stack,
        });
    }
    return res.status(500).json({
        status: false,
        message: err.message || "Something went wrong!",
        error: process.env.NODE_ENV === "PRODUCTION" ? null : err.stack,
        type: "error",
        data: null,
    });
};
