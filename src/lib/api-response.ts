import { NextResponse } from 'next/server'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function successResponse<T>(data: T, meta?: ApiResponse['meta']): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  })
}

export function errorResponse(
  code: string,
  message: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  )
}

export function unauthorizedResponse(message: string = 'Vui lòng đăng nhập'): NextResponse<ApiResponse> {
  return errorResponse('UNAUTHORIZED', message, 401)
}

export function forbiddenResponse(message: string = 'Bạn không có quyền thực hiện thao tác này'): NextResponse<ApiResponse> {
  return errorResponse('FORBIDDEN', message, 403)
}

export function notFoundResponse(message: string = 'Không tìm thấy dữ liệu'): NextResponse<ApiResponse> {
  return errorResponse('NOT_FOUND', message, 404)
}

export function validationErrorResponse(message: string): NextResponse<ApiResponse> {
  return errorResponse('VALIDATION_ERROR', message, 422)
}

export function rateLimitResponse(): NextResponse<ApiResponse> {
  return errorResponse('RATE_LIMIT_EXCEEDED', 'Quá nhiều yêu cầu, vui lòng thử lại sau', 429)
}

export function serverErrorResponse(message: string = 'Lỗi hệ thống, vui lòng thử lại sau'): NextResponse<ApiResponse> {
  return errorResponse('INTERNAL_ERROR', message, 500)
}

// Parse pagination params
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const skip = (page - 1) * pageSize
  
  return { page, pageSize, skip }
}

// Parse sort params
export function parseSort(searchParams: URLSearchParams, allowedFields: string[]) {
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  
  if (!allowedFields.includes(sortBy)) {
    return { orderBy: { createdAt: 'desc' as const } }
  }
  
  return { orderBy: { [sortBy]: sortOrder } }
}
