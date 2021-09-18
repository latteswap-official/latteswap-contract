import ProdConfig from "@latteswap/latteswap-contract-config/prod.json";
import DevelopConfig from "@latteswap/latteswap-contract-config/develop.json";

export type IConfig = typeof DevelopConfig | typeof ProdConfig;

export function getConfig(): IConfig {
  const config = process.env.DEPLOYMENT_ENV === "prod" ? ProdConfig : DevelopConfig;
  return config;
}
