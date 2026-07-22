import { Response } from "express";

export class ApiResponse {
  static success(
    res: Response,
    data: any = null,
    message: string = "Success",
    statusCode: number = 200,
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res: Response, data: any = null, message: string = "Created") {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  static error(
    res: Response,
    message: string = "Internal Server Error",
    statusCode: number = 500,
    errors: any = null,
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static badRequest(
    res: Response,
    message: string = "Bad Request",
    errors: any = null,
  ) {
    return ApiResponse.error(res, message, 400, errors);
  }

  static unauthorized(res: Response, message: string = "Unauthorized") {
    return ApiResponse.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = "Forbidden") {
    return ApiResponse.error(res, message, 403);
  }

  static notFound(res: Response, message: string = "Not Found") {
    return ApiResponse.error(res, message, 404);
  }

  static conflict(res: Response, message: string = "Conflict") {
    return ApiResponse.error(res, message, 409);
  }

  static paginated(
    res: Response,
    data: any[],
    total: number,
    page: number,
    limit: number,
    message: string = "Success",
  ) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
}
