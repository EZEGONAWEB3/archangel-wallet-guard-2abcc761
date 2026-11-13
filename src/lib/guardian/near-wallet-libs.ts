/**
 * Every NEAR wallet/SDK package the browser needs, behind ONE dynamic import (see
 * wallet-modules.ts). A single entry keeps the bundler from splitting these packages into
 * chunks that import each other in a cycle, which breaks them at load time in production.
 * Never import this file statically or from server code.
 */
export { setupWalletSelector } from "@near-wallet-selector/core";
export { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
export { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
export { setupIntearWallet } from "@near-wallet-selector/intear-wallet";
export { actionCreators } from "@near-js/transactions";
