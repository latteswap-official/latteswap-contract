import ProdConfig from "@latteswap/latteswap-contract-config/prod.json";
import DevelopConfig from "@latteswap/latteswap-contract-config/develop.json";

export interface IConfig {
  ProxyAdmin: string;
  Timelock: string;
  Factory: string;
  Router: string;
  MasterBarista: string;
  LatteVault: string;
  InitCodeHash: string;
  Tokens: ITokens;
  BeanBag: string;
  MultiCall: string;
  Booster: string;
  BoosterConfig: string;
  LatteNFT: string;
  WnativeRelayer: string;
  OGNFT: string;
  LatteMarket: string;
}

export interface ITokens {
  LATTE: string;
  BUSD: string;
  WBNB: string;
  ETH: string;
  BTCB: string;
  CAKE: string;
  ALPACA: string;
  XVS: string;
  EPS: string;
  BELT: string;
  MDX: string;
  AUTO: string;
  BSW: string;
  WEX: string;
  O3: string;
  BIFI: string;
  BAKE: string;
  BANANA: string;
  BUNNY: string;
  DOGE: string;
}

export function getConfig(): IConfig {
  const config = process.env.DEPLOYMENT_ENV === "prod" ? ProdConfig : DevelopConfig;
  return config;
}
