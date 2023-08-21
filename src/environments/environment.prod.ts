// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
declare var require: any;
import { APP_VERSION } from './version';

import { ConfigParams } from '@app/state/config-params';

export const environment: ConfigParams = {
  production: true,
  environment: 'production',
  graphql_endpoint: 'https://api.communitytechaid.org.uk/graphql',
  version: APP_VERSION,
  auth_endpoint: 'https://api.communitytechaid.org.uk/auth/user',
  auth_audience: 'https://api.communitytechaid.org.uk',
  auth_enabled: true,
  remote_config: false,
};
