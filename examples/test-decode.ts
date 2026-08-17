import { SignDoc, TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { createUnsignedCosmosTransaction } from "./stubs";

const main = async () => {
    try {
        const twoPartyPublicKey = new Uint8Array(33);
        const twoPartyAddress = "heim1nykywy8adjzttz2hctccjnqmlpgzf4x8alrsnj";
        const receiverAddress = "heim1ccs2dyh0jk2uecrz86rtc2k7lp66vycxswrxsx";
        const txBytes = await createUnsignedCosmosTransaction(twoPartyPublicKey, twoPartyAddress, receiverAddress);
        const txHex = Buffer.from(txBytes).toString('hex');
        console.log("Tx Hex:", txHex);

        const signDocBytes = Buffer.from(txHex, 'hex');
        const signDoc = SignDoc.decode(signDocBytes);
        console.log("SignDoc decoded:", signDoc);

        const txBody = TxBody.decode(signDoc.bodyBytes);
        console.log("TxBody decoded:", txBody);

        const firstMsg = txBody.messages[0];
        console.log("FirstMsg:", firstMsg);

        const msgSend = MsgSend.decode(firstMsg.value);
        console.log("MsgSend decoded successfully:", msgSend);
    } catch (e) {
        console.error("Decode failed with error:", e);
    }
}
main();
