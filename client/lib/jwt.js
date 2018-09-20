import Crypto from "crypto";
import AddMinutes from "./add-minutes";
import AddSeconds from "./add-minutes";
import AddHours from "./add-hours";

function Base64urlEncode(str) {
	return new Buffer.from(str)
	.toString('base64')
	.replace(/\+/g, '-')
	.replace(/\//g, '_')
	.replace(/=/g, '');
}

function OctetFromClaims(claims) {
	const octets = [];
	for (let i = 0, length = claims.length; i < length; i++) {
		const code = claims.charCodeAt(i);
		octets.push(code & 0xff);
	}
	return octets;
}

function Base64Claims(octets) {
	return Base64urlEncode(octets);
}

function CreateJOSEbody(input) {
	const octets = OctetFromClaims(input);
	const joseBody = Base64urlEncode(octets);
	return joseBody;
}

function CreateToken(alg, key, header, message) {
	const signature = Crypto.createHmac(alg, key).update(`${header}.${message}`).digest("utf8");
	return CreateJOSEbody(signature);
}

function CreateJWT(claims) {
	const header = '{"typ":"JWT",\r\n "alg":"HS256"}';
	// JWS -> JSON Web Signature
	// JWE -> JSON Web Encryption
	// JOSE --> JSON Object Signing and Encryption

	// 1. Create a JWT Claims Set containing the desired claims.
	// -> claims

	// 2. Let the Message be the octets of the UTF-8 representation of the JWT Claims Set.
	// --> OctetFromClaims

	// 3. Create a JOSE Header containing the desired set of Header
	// Parameters. The JWT MUST conform to either the [JWS] or [JWE]
	// specification. Note that whitespace is explicitly allowed in the
	// representation and no canonicalization need be performed before
	// encoding.
	// --> Base64Claims

	const joseHeader = CreateJOSEbody(header);
	const joseMessage = CreateJOSEbody(claims);

	// 4. Depending upon whether the JWT is a JWS or JWE, there are two
	// cases:
	// 	* If the JWT is a JWS, create a JWS using the Message as the JWS
	// Payload; all steps specified in [JWS] for creating a JWS MUST
	// be followed.
	// * Else, if the JWT is a JWE, create a JWE using the Message as
	// the plaintext for the JWE; all steps specified in [JWE] for
	// 	creating a JWE MUST be followed.

	// 5. If a nested signing or encryption operation will be performed,
	// 	let the Message be the JWS or JWE, and return to Step 3, using a
	// "cty" (content type) value of "JWT" in the new JOSE Header
	// created in that step.

	// 6. Otherwise, let the resulting JWT be the JWS or JWE.

	// Optional registered claims header vals
	// --> iss (issuer)
	// --> sub (subject)
	// --> aud (audience)
	// --> exp (expiration time, timestamp with or without fractions)
	// --> nbf (not before) reverse expiration time
	// --> iat (issued at, timestamp)
	// --> jti (unique identifier. can be used to prevent the JWT from being replayed)
	const signature = CreateToken("sha256", "big-secret", joseHeader, joseMessage);
	return `${joseHeader}.${joseMessage}.${signature}`
}

function Sign(key, _claims, units, unit) {
	const header = '{"typ":"JWT",\r\n "alg":"HS256"}';

	let expireAt = "";
	switch (unit) {
		case "seconds": {
			expireAt = AddSeconds(new Date(), units).getTime()
		}
		case "minutes": {
			expireAt = AddMinutes(new Date(), units).getTime()
		}
		case "hours": {
			expireAt = AddHours(new Date(), units).getTime()
		}
	}

	const claims = Object.assign({}, _claims, {
		"exp": expireAt
	});

	// const claims = Buffer.from(JSON.stringify(opts)).toString("base64");

	const joseHeader = CreateJOSEbody(header);
	const joseMessage = CreateJOSEbody(JSON.stringify(claims));

	const signature = Crypto.createHmac('sha256', key).update(`${joseHeader}.${joseMessage}`).digest('base64');


	return `${joseHeader}.${joseMessage}.${signature}`;
}

function Verify(key, token) {

	const _ = token.split(".");
	const message = Buffer.from(_[1], 'base64').toString('ascii'),
		retrievedSignature = _[2],
		retrievedHeader = _[0];

	const computedSignature = Crypto.createHmac('sha256', key).update(`${_[0]}.${_[1]}`).digest('base64');
	const computedSignatureBuffer = Buffer.from(computedSignature, 'base64');
	const retrievedSignatureBuffer = Buffer.from(retrievedSignature, 'base64');

	try {
		const valid = Crypto.timingSafeEqual(computedSignatureBuffer, retrievedSignatureBuffer);
		if (valid) {
			return message;
		}
	}
	catch (e) {
		return e;
	}
}

export default {
	OctetFromClaims,
	Base64Claims,
	CreateJWT,
	Sign,
	Verify
}

