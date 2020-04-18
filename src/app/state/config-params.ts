export interface ConfigParams {
    production: boolean
    graphql_endpoint: string
    environment: string
    auth_enabled: boolean
    remote_config: boolean
    auth_endpoint?: string
    version: any
    pusher?: any
}