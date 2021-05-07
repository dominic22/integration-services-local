import { NextFunction, Request, Response } from 'express';
import { User, UserSearch, UserType } from '../../models/types/user';
import { UserService } from '../../services/user-service';
import * as _ from 'lodash';
import { StatusCodes } from 'http-status-codes';
import { getDateFromString } from '../../utils/date';
import { AuthenticatedRequest } from '../../models/types/authentication';
import { AuthorizationService } from '../../services/authorization-service';
import Ajv from 'ajv';
import { DeviceSchema, OrganizationSchema, PersonSchema, ProductSchema, ServiceSchema } from '../../models/schemas/user-types';
const ajv = new Ajv();

export class UserRoutes {
	private readonly userService: UserService;
	private readonly authorizationService: AuthorizationService;
	constructor(userService: UserService, authorizationService: AuthorizationService) {
		this.userService = userService;
		this.authorizationService = authorizationService;
	}

	searchUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userSearch = this.getUserSearch(req);
			const users = await this.userService.searchUsers(userSearch);
			res.send(users);
		} catch (error) {
			next(error);
		}
	};

	getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = _.get(req, 'params.userId');

			if (_.isEmpty(userId)) {
				res.sendStatus(StatusCodes.BAD_REQUEST);
				return;
			}

			const user = await this.userService.getUser(userId);
			res.send(user);
		} catch (error) {
			next(error);
		}
	};

	addUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user: User = req.body;
			this.validateUser(user);
			const result = await this.userService.addUser(user);

			if (!result?.result?.n) {
				res.status(StatusCodes.NOT_FOUND).send({ error: 'could not add user!' });
				return;
			}

			res.sendStatus(StatusCodes.CREATED);
		} catch (error) {
			next(error);
		}
	};

	updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user: User = req.body;

			const { isAuthorized, error } = await this.authorizationService.isAuthorized(req.user, user.userId);
			if (!isAuthorized) {
				throw error;
			}

			const result = await this.userService.updateUser(user);

			if (!result?.result?.n) {
				res.status(StatusCodes.NOT_FOUND).send({ error: 'No user found to update!' });
				return;
			}

			res.sendStatus(StatusCodes.OK);
		} catch (error) {
			next(error);
		}
	};

	deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = _.get(req, 'params.userId');
			if (_.isEmpty(userId)) {
				res.sendStatus(StatusCodes.BAD_REQUEST);
				return;
			}

			const { isAuthorized, error } = await this.authorizationService.isAuthorized(req.user, userId);
			if (!isAuthorized) {
				throw error;
			}

			await this.userService.deleteUser(userId);
			res.sendStatus(StatusCodes.OK);
		} catch (error) {
			next(error);
		}
	};

	getUserSearch = (req: Request): UserSearch => {
		const decodeParam = (param: string): string | undefined => (param ? decodeURI(param) : undefined);
		const type = decodeParam(<string>req.query.type);
		const organization = decodeParam(<string>req.query.organization);
		const username = decodeParam(<string>req.query.username);
		const verifiedParam = decodeParam(<string>req.query.verified);
		const registrationDate = decodeParam(<string>req.query['registration-date']);
		const verified = verifiedParam != null ? Boolean(verifiedParam) && verifiedParam == 'true' : undefined;
		let subscribedChannelIds: string[] = <string[]>req.query['subscribed-channel-ids'] || undefined;
		if (subscribedChannelIds != null && !Array.isArray(subscribedChannelIds)) {
			// we have a string instead of string array!
			subscribedChannelIds = [decodeParam(subscribedChannelIds)];
		} else if (Array.isArray(subscribedChannelIds)) {
			subscribedChannelIds = subscribedChannelIds.map((s) => decodeParam(s));
		}
		const limitParam = parseInt(<string>req.query.limit, 10);
		const indexParam = parseInt(<string>req.query.index, 10);
		const limit = isNaN(limitParam) || limitParam == 0 ? undefined : limitParam;
		const index = isNaN(indexParam) ? undefined : indexParam;

		return {
			type: <UserType>type,
			index,
			limit,
			organization,
			verified,
			username,
			registrationDate: getDateFromString(registrationDate),
			subscribedChannelIds
		};
	};

	validateUser = (user: User) => {
		let validate: Ajv.ValidateFunction;

		switch (user.type) {
			case UserType.Person:
				validate = ajv.compile(PersonSchema);
				break;
			case UserType.Device:
				validate = ajv.compile(DeviceSchema);
				break;
			case UserType.Organization:
				validate = ajv.compile(OrganizationSchema);
				break;
			case UserType.Product:
				validate = ajv.compile(ProductSchema);
				break;
			case UserType.Service:
				validate = ajv.compile(ServiceSchema);
				break;

			default:
				break;
		}

		const validDetails = <boolean>validate(user.data);
		if (!validDetails) {
			throw new Error('no valid user data');
		}
	};
}
