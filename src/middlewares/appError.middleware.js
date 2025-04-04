class AppError extends Error{
    constructor(statusCode, message = "Something Went Wrong :|", error){
        super(message);
        this.statusCode = statusCode;
        this.error = error;
        this.success = false;
    }
}

export {AppError};