import { service } from '../src/runtime.mjs';
import { createHandler } from '../src/http.mjs';
export default createHandler(service.places, 'places');
