import { Type } from '@sinclair/typebox';
import { TopicSchema, ChannelType } from '../channel-info';

export const CreateChannelBodySchema = Type.Object({
	name: Type.Optional(
		Type.String({
			description: 'A channel can be searched by its name.'
		})
	),
	description: Type.Optional(
		Type.String({
			description: 'An optional description for a channel.'
		})
	),
	type: Type.Optional(Type.Enum(ChannelType, { description: 'Channel type used to differ between public and private channels.' })),
	hidden: Type.Optional(
		Type.Boolean({
			default: false,
			description:
				'If set to true the channel can not be found by others. It will be still possible to give specific users access to the channel.'
		})
	),
	visibilityList: Type.Optional(Type.Array(Type.Object({ id: Type.String() }))),
	topics: Type.Array(TopicSchema),
	hasPresharedKey: Type.Optional(
		Type.Boolean({
			description:
				'If the channel has a preshared key (hasPresharedKey=true) but non is set in the presharedKey property it will be generated by the api.'
		})
	),
	seed: Type.Optional(
		Type.String({
			minLength: 1,
			description:
				'If left empty the api will generate a seed automatically. Always store your seed otherwise the data can not be reimported.'
		})
	),
	presharedKey: Type.Optional(
		Type.String({
			minLength: 32,
			maxLength: 32,
			description:
				'If the channel has a preshared key (hasPresharedKey=true) but non is defined here the presharedKey will be generated by the api.'
		})
	)
});

export const CreateChannelResponseSchema = Type.Object({
	seed: Type.Optional(Type.String({ minLength: 1 })),
	channelAddress: Type.String({ minLength: 105, maxLength: 105 }),
	presharedKey: Type.Optional(
		Type.String({
			minLength: 32,
			maxLength: 32
		})
	)
});

export const AddChannelLogBodySchema = Type.Object({
	type: Type.Optional(Type.String({ minLength: 1, description: 'Public available type.' })),
	created: Type.Optional(Type.String({ format: 'date-time', description: 'Public available date.' })),
	metadata: Type.Optional(Type.Any({ description: 'Public available metadata.' })),
	publicPayload: Type.Optional(Type.Any({ description: 'Public available payload.' })),
	payload: Type.Optional(Type.Any({ description: 'Payload is stored encrypted in the channel.' })),
	sharedKey: Type.Optional(Type.Any({ description: 'Shared key required for privatePlus channels.' }))
});

export const ReimportBodySchema = Type.Object({
	seed: Type.Optional(Type.String({ minLength: 1 })),
	subscriptionPassword: Type.Optional(
		Type.String({
			minLength: 8,
			description:
				'If a subscriptionPassword is set, all data is encrypted with the password. It need to be made sure, the subscription password is sent when interacting with the APIs of the channel-service and subscription-service.'
		})
	) // TODO#156 use to decrypt/encrypt data and state
});

export const ChannelLogSchema = AddChannelLogBodySchema;

export const ChannelDataSchema = Type.Object({
	link: Type.String(),
	imported: Type.Optional(
		Type.String({ format: 'date-time', description: 'Date when the data was imported from the tangle into the cached database.' })
	),
	messageId: Type.Optional(Type.String({ description: 'Message id can be used to search for the message in an IOTA explorer.' })),
	source: Type.Optional(
		Type.Object({
			publicKey: Type.Optional(Type.String({ description: 'Public key which signed the message.' })),
			id: Type.Optional(Type.String({ description: 'Corresponding id to the public key.' }))
		})
	),
	log: ChannelLogSchema
});

export const ValidateBodySchema = Type.Array(ChannelDataSchema);

export const ValidateResponseSchema = Type.Array(
	Type.Object({
		link: Type.String(),
		isValid: Type.Boolean(),
		error: Type.Optional(Type.String()),
		tangleLog: Type.Optional(Type.Any())
	})
);
