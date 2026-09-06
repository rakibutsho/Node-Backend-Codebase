import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import handleZodError from "../../errors/handleZodError";
import parsePrismaValidationError from "../../errors/parsePrismaValidationError";
import ApiError from "../../errors/ApiErrors";
import config from "../../config";

const GlobalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: any = httpStatus.INTERNAL_SERVER_ERROR;
  let message = err.message || "Something went wrong!";
  let errorSources = [];
  let errorDetails = err || null;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  }
  // Handle Custom ApiError
  else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [{ type: "ApiError", details: err.message }];
  }
  // Handle Prisma Known Request Errors (unique constraints, not found, foreign key)
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = httpStatus.CONFLICT;
      const target = (err.meta?.target as string[]) || [];
      const fields = Array.isArray(target) ? target.join(", ") : String(target);
      message = `A record with this ${fields || "value"} already exists.`;
      errorSources.push({ type: "UniqueConstraintError", details: message });
    } else if (err.code === "P2025") {
      statusCode = httpStatus.NOT_FOUND;
      message = (err.meta?.cause as string) || "Record not found.";
      errorSources.push({ type: "NotFoundError", details: message });
    } else if (err.code === "P2003") {
      statusCode = httpStatus.BAD_REQUEST;
      message = "Foreign key constraint violation.";
      errorSources.push({ type: "ForeignKeyError", details: message });
    } else {
      statusCode = httpStatus.BAD_REQUEST;
      message = err.message;
      errorSources.push({ type: "PrismaKnownRequestError", details: err.message });
    }
  }
  // handle prisma client validation errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = parsePrismaValidationError(err.message);
    errorSources.push("Prisma Client Validation Error");
  }
  // Prisma Client Initialization Error
  else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message =
      "Failed to initialize Prisma Client. Check your database connection or Prisma configuration.";
    errorSources.push("Prisma Client Initialization Error");
  }
  // Prisma Client Rust Panic Error
  else if (err instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message =
      "A critical error occurred in the Prisma engine. Please try again later.";
    errorSources.push("Prisma Client Rust Panic Error");
  }
  // Prisma Client Unknown Request Error
  else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = "An unknown error occurred while processing the request.";
    errorSources.push("Prisma Client Unknown Request Error");
  }
  // Generic Error Handling (e.g., JavaScript Errors)
  else if (err instanceof SyntaxError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Syntax error in the request. Please verify your input.";
    errorSources.push("Syntax Error");
  } else if (err instanceof TypeError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = "An internal error occurred.";
    errorSources.push("Type Error");
  } else if (err instanceof ReferenceError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = "An internal error occurred.";
    errorSources.push("Reference Error");
  }
  // Catch any other error type
  else {
    message = "An unexpected error occurred!";
    errorSources.push("Unknown Error");
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err instanceof ApiError && err.code ? { errorCode: err.code } : {}),
    errorSources,
    stack: config.env === "development" ? err?.stack : undefined,
  });
};

export default GlobalErrorHandler;
