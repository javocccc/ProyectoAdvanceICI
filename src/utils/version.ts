import packageInfo from "../../package.json";

export const versionAplicacion = import.meta.env.VITE_APP_VERSION ?? packageInfo.version;
