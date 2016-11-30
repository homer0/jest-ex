/* eslint import/prefer-default-export: 0 */
import { JestExTransformer } from './index';
/**
 * This is the default implementation of the Jest-Ex Transformer. If you are using the
 * Jest-Ex Runner and you set the `addTransformer` flag to true, your Jest configuration
 * will point to this file for transforming `js/jsx` files.
 * You can also manually point to this file from your Jest configuration.
 * @type {JestExTransformer}
 */
export const process = new JestExTransformer().process;
