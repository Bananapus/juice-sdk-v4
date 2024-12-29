const DEBUG_ENV_VARS = [
  "JUICE_SDK_DEBUG",
  "REACT_APP_JUICE_SDK_DEBUG",
  "NEXT_PUBLIC_JUICE_SDK_DEBUG",
];

export function debug(...args: any[]) {
  if (DEBUG_ENV_VARS.some((envVar) => process.env[envVar] === "true")) {
    return;
  }

  console.log("🧃", ...args);
}
