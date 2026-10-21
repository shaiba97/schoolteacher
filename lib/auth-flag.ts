// Dev bypass mirroring the backend AUTH_NO_SESSION flag: when true, the
// portal guard lets every request through (backend still enforces its own
// bypass). Never enable in production.
export const TEACHER_NO_AUTH_BYPASS = process.env.TEACHER_NO_AUTH === "true";
