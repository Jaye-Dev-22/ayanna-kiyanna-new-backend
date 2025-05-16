import { NextResponse } from 'next/server';

export default function middleware(request) {
  const response = NextResponse.next();
  
  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', [
    'http://localhost:5173',
    'https://ayanna-kiyanna-new-frontend.vercel.app',
    'https://ayanna-kiyanna-new-frintend.vercel.app'
  ].join(', '));
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: Object.fromEntries(response.headers)
    });
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*',  // Apply to all API routes
};