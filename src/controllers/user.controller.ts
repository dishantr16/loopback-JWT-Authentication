import {repository} from '@loopback/repository';
import {UserRepository, Credentials} from '../repositories';
import {post, getJsonSchemaRef, requestBody, get} from '@loopback/rest';
import {User} from '../models';
import {validateCredentials} from '../services/validator';
import * as _ from 'lodash';
import {inject} from '@loopback/core';
import {BcryptHasher} from '../services/hash.password.bcrypt';
//import {} from './specs/user.controller.spec';
import {MyUserService} from '../services/user-service.service';
import {JWTService} from '../services/jwt-service.service';
import {
  PasswordHasherBindings,
  UserServiceBindings,
  TokenServiceBindings,
} from '../keys';
import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {securityId,UserProfile} from '@loopback/security';
import {PermissionKeys} from '../authorization/permission-keys';
// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public hasher: BcryptHasher,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: JWTService,
  ) {}

  @post('/users/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          schema: getJsonSchemaRef(User),
        },
      },
    },
  })
  async signup(@requestBody() userData: User) {
    validateCredentials(_.pick(userData, ['email', 'password']));
    userData.permission = [PermissionKeys.AccessAuthFeature];

    userData.password = await this.hasher.hashPassword(userData.password);

    const savedUser = await this.userRepository.create(userData);
    //delete savedUser.password;
    return savedUser;
  }

  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody() credentials: Credentials,
  ): Promise<{token: string}> {
    // make sure user exist, password should be valid
    const user = await this.userService.verifyCredentials(credentials);
    const userProfile = this.userService.convertToUserProfile(user);
    const token = await this.jwtService.generateToken(userProfile);
    return Promise.resolve({token});
  }

  @get('users/me')
  @authenticate('jwt')
  async me(
    @inject (AuthenticationBindings.CURRENT_USER)
    currentUser: UserProfile,
  ): Promise<UserProfile> {
    return Promise.resolve(currentUser);
  }
}

