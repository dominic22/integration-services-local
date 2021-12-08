import {
  IdentityClient,
  Manager,
  IdentityJson,
  CredentialTypes,
  UserType
} from 'integration-services-node';
import * as dotenv from 'dotenv';
import { externalDriverCredential1, externalDriverCredential2 } from './externalData';
dotenv.config();

const identity = new IdentityClient();
let rootIdentityWithKeys: IdentityJson;

async function setup() {
  // Create db connection
  const manager = new Manager(
    process.env.MONGO_URL!,
    process.env.DB_NAME!,
    process.env.SECRET_KEY!
  );
  // Get root identity directly from db
  rootIdentityWithKeys = await manager.getRootIdentity();
  await manager.close();
}
async function trustedAuthorities() {
  // Authenticate as the root identity
  await identity.authenticate(rootIdentityWithKeys.doc.id, rootIdentityWithKeys.key.secret);

  // Create an identity for a driver to issue him a driving license
  const driverIdentity = await identity.create('Driver', {
    type: 'User'
  });

  //Get root identity to issue an credential for the new driver
  const rootIdentity = await identity.find(rootIdentityWithKeys?.doc?.id);
  console.log(`Root identity's id: `, rootIdentity.identityId);

  // Get root identity's credential to create new credentials
  // @ts-ignore: Object is possibly 'null'.
  const identityCredential = rootIdentity!.verifiableCredentials[0];

  // List all trusted authorities, currently only one authority is trusted for issuing credentials
  const trustedAuthorities = await identity.getTrustedAuthorities();
  console.log('Trusted authorities: ', trustedAuthorities);

  // Assign a verifiable credential to the driver for drive allowance
  const driverCredential = await identity.createCredential(
    identityCredential,
    driverIdentity?.doc?.id,
    CredentialTypes.BasicIdentityCredential,
    UserType.Person,
    {
      driveAllowance: true,
      issuanceDate: new Date()
    }
  );

  // Verify the drivers license issued by the local authority.
  // Verification result should be positive
  const verified1 = await identity.checkCredential(driverCredential);
  console.log('Internal drivers license verification: ', verified1);

  // Verify the drivers license issued by an external authority.
  // This drivers license will not be trusted because it was not added as an trusted authority by us.
  const verified2 = await identity.checkCredential(externalDriverCredential1);
  console.log('Driving authority verification: ', verified2);

  // Added the external authority to the trusted authorities.
  // The id of the external authority can be found in the external credential
  const externalTrustedAuthority = externalDriverCredential1.issuer;
  await identity.addTrustedAuthority(externalTrustedAuthority);

  // List all trustedAuthorities, to verify the external authority has been added
  const trustedAuthorities2 = await identity.getTrustedAuthorities();
  console.log('Trusted authorities: ', trustedAuthorities2);

  // Verify the drivers license issued by the local authority again
  // Verification result should be true again
  const verified4 = await identity.checkCredential(driverCredential);
  console.log('Internal drivers license verification: ', verified4);

  // Verify the drivers license issued by an external authority.
  // This time the verification result should be positive
  const verified5 = await identity.checkCredential(externalDriverCredential1);
  console.log('Driving authority verification: ', verified5);

  // Remove the external authority again, just for repeatability
  await identity.removeTrustedAuthority(externalTrustedAuthority);
}

async function main() {
  await setup();
  await trustedAuthorities();
}

main();
