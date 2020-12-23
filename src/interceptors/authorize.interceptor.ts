import {
  /* inject, */
  globalInterceptor,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  inject,
  Getter,
} from '@loopback/context';
import {
  AuthenticationBindings,
  AuthenticationMetadata,
} from '@loopback/authentication';
import {RequiredPermissions, MyUserProfile} from '../types';
import {intersection} from 'lodash';
import {HttpErrors} from '@loopback/rest';
import {ApplicationMetadata} from '@loopback/core';
/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@globalInterceptor('', {tags: {name: 'authorize'}})
export class AuthorizeInterceptor implements Provider<Interceptor> {
  constructor (
    @inject(AuthenticationBindings.METADATA)
    public metadata: ApplicationMetadata,
    @inject.getter(AuthenticationBindings.CURRENT_USER)
    public getCurrentUser: Getter<MyUserProfile>,
  ) {}

  /**
   * This method is used by LoopBack context to produce an interceptor function
   * for the binding.
   *
   * @returns An interceptor function
   */
  value() {
    return this.intercept.bind(this);
  }

  /**
   * The logic to intercept an invocation
   * @param invocationCtx - Invocation context
   * @param next - A function to invoke next interceptor or the target method
   */
  async intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    // eslint-disable-next-line no-useless-catch
    try {
      // Add pre-invocation logic here
      console.log('Log from authorize global interceptor');
      console.log(this.metadata);
      //if you will not provide options in your @authenticate decorator
      //this line will be executed
      if (!this.metadata) return await next();

      const result = await next();
      const requiredPermissions = this.metadata.options as unknown as RequiredPermissions;
      console.log(requiredPermissions);
      const user = await this.getCurrentUser();
      console.log('User Permissions: ', user.permissions);

      const results = intersection(
        user.permissions,
        requiredPermissions.required,
      ).length;
      if (results !== requiredPermissions.required.length) {
        throw new HttpErrors.Forbidden('INVALID ACCESS PERMISSIONS');
      }

      //check the user permissions
      return result;
    } catch (err) {
      // Add error handling logic here
      throw err;
    }
  }
}