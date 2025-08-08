export function errorObject(message, code = 400, ctx = null) {
  return JSON.stringify({ status: false, code, message, ctx });
}
