// Simple console-based logger to replace winston
const getTimestamp = () =>
	new Date().toISOString().replace("T", " ").split(".")[0];

export const logger = {
	info: (message: string, meta?: any) => {
		const metaString = meta ? ` ${JSON.stringify(meta)}` : "";
		console.log(`${getTimestamp()} [INFO]: ${message}${metaString}`);
	},
	error: (message: string, meta?: any) => {
		const metaString = meta ? ` ${JSON.stringify(meta)}` : "";
		console.error(`${getTimestamp()} [ERROR]: ${message}${metaString}`);
	},
	warn: (message: string, meta?: any) => {
		const metaString = meta ? ` ${JSON.stringify(meta)}` : "";
		console.warn(`${getTimestamp()} [WARN]: ${message}${metaString}`);
	},
	debug: (message: string, meta?: any) => {
		const metaString = meta ? ` ${JSON.stringify(meta)}` : "";
		console.debug(`${getTimestamp()} [DEBUG]: ${message}${metaString}`);
	},
};

// Create a stream object with a 'write' function that will be used by morgan
export const loggerStream = {
	write: (message: string) => {
		// Morgan messages already include timestamp and formatting, so just log directly
		console.log(message.trim());
	},
};
