"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var eth_crypto_1 = __importDefault(require("eth-crypto"));
var new_keypair = eth_crypto_1.default.createIdentity();
console.log(JSON.stringify(new_keypair));
