package main

//go:generate gopherjs build --minify

// This is an experiment to see if gopherjs can reasonably generate js code from go source
// so that we can have a single-source solution for keys and addresses.
// Use "go generate" to build this.

import (
	"github.com/gopherjs/gopherjs/js"
	"go.dedis.ch/kyber/v3/encrypt/ecies"
	"go.dedis.ch/kyber/v3/group/curve25519"
)

var edSuite = curve25519.NewBlakeSHA256Curve25519(false)

func main() {
	js.Module.Get("exports").Set("encryptCurve25519", encryptCurve25519)
	js.Module.Get("exports").Set("decryptCurve25519", decryptCurve25519)

}

func encryptCurve25519(pubKey []byte, plaintext []byte) ([]byte, error) {

	eciesPub := edSuite.Point().Clone()
	err := eciesPub.UnmarshalBinary(pubKey)
	if err != nil {
		return nil, err
	}

	ciphertext, err := ecies.Encrypt(edSuite, eciesPub, plaintext, nil)
	if err != nil {
		return nil, err
	}

	return ciphertext, nil
}

func decryptCurve25519(privKey []byte, ciphertext []byte) ([]byte, error) {

	eciesPri := edSuite.Scalar().Clone().SetBytes(privKey)

	plaintext, err := ecies.Decrypt(edSuite, eciesPri, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}
