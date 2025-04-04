class ApiResponse{
    constructor(status, message, data, err = null){
        this.status = status;
        this.message = message;
        this.data = data;
        this.err = err;
        this.timestamp = new Date();
    }
}

export default ApiResponse;