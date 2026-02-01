/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/recipes/route";
exports.ids = ["app/api/recipes/route"];
exports.modules = {

/***/ "(rsc)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Frecipes%2Froute&page=%2Fapi%2Frecipes%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Frecipes%2Froute.ts&appDir=%2FUsers%2Fjosiahkerrick%2FDesktop%2Fcooking_recipe_app%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fjosiahkerrick%2FDesktop%2Fcooking_recipe_app%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Frecipes%2Froute&page=%2Fapi%2Frecipes%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Frecipes%2Froute.ts&appDir=%2FUsers%2Fjosiahkerrick%2FDesktop%2Fcooking_recipe_app%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fjosiahkerrick%2FDesktop%2Fcooking_recipe_app%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_josiahkerrick_Desktop_cooking_recipe_app_apps_web_app_api_recipes_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/recipes/route.ts */ \"(rsc)/./app/api/recipes/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/recipes/route\",\n        pathname: \"/api/recipes\",\n        filename: \"route\",\n        bundlePath: \"app/api/recipes/route\"\n    },\n    resolvedPagePath: \"/Users/josiahkerrick/Desktop/cooking_recipe_app/apps/web/app/api/recipes/route.ts\",\n    nextConfigOutput,\n    userland: _Users_josiahkerrick_Desktop_cooking_recipe_app_apps_web_app_api_recipes_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL25leHRAMTUuMy4yX0BiYWJlbCtjb3JlQDcuMjcuNF9yZWFjdC1kb21AMTkuMS4wX3JlYWN0QDE5LjEuMF9fcmVhY3RAMTkuMS4wL25vZGVfbW9kdWxlcy9uZXh0L2Rpc3QvYnVpbGQvd2VicGFjay9sb2FkZXJzL25leHQtYXBwLWxvYWRlci9pbmRleC5qcz9uYW1lPWFwcCUyRmFwaSUyRnJlY2lwZXMlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnJlY2lwZXMlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZyZWNpcGVzJTJGcm91dGUudHMmYXBwRGlyPSUyRlVzZXJzJTJGam9zaWFoa2VycmljayUyRkRlc2t0b3AlMkZjb29raW5nX3JlY2lwZV9hcHAlMkZhcHBzJTJGd2ViJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmpvc2lhaGtlcnJpY2slMkZEZXNrdG9wJTJGY29va2luZ19yZWNpcGVfYXBwJTJGYXBwcyUyRndlYiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDaUM7QUFDOUc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9qb3NpYWhrZXJyaWNrL0Rlc2t0b3AvY29va2luZ19yZWNpcGVfYXBwL2FwcHMvd2ViL2FwcC9hcGkvcmVjaXBlcy9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvcmVjaXBlcy9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL3JlY2lwZXNcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL3JlY2lwZXMvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvam9zaWFoa2Vycmljay9EZXNrdG9wL2Nvb2tpbmdfcmVjaXBlX2FwcC9hcHBzL3dlYi9hcHAvYXBpL3JlY2lwZXMvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Frecipes%2Froute&page=%2Fapi%2Frecipes%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Frecipes%2Froute.ts&appDir=%2FUsers%2Fjosiahkerrick%2FDesktop%2Fcooking_recipe_app%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fjosiahkerrick%2FDesktop%2Fcooking_recipe_app%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!********************************************************************************************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \********************************************************************************************************************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/../../packages/db/src/server/index.ts":
/*!*********************************************!*\
  !*** ../../packages/db/src/server/index.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createSupabaseServerClient: () => (/* binding */ createSupabaseServerClient),\n/* harmony export */   supabase: () => (/* binding */ supabase)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/../../node_modules/.pnpm/@supabase+supabase-js@2.49.8/node_modules/@supabase/supabase-js/dist/module/index.js\");\n/* harmony import */ var _shared_env__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shared/env */ \"(rsc)/../../packages/db/src/shared/env.ts\");\n\n\n/**\n * Server-only Supabase client.\n *\n * NOTE: This is intentionally NOT auto-detected by imports.\n * You must import from `@acme/db/server`.\n */ function createSupabaseServerClient() {\n    const url = (0,_shared_env__WEBPACK_IMPORTED_MODULE_0__.requireEnv)('NEXT_PUBLIC_SUPABASE_URL');\n    // Keep NEXT_PRIVATE_SUPABASE_KEY as primary to avoid behavior changes.\n    const serverKey = (0,_shared_env__WEBPACK_IMPORTED_MODULE_0__.getOptionalEnv)('NEXT_PRIVATE_SUPABASE_KEY') ?? (0,_shared_env__WEBPACK_IMPORTED_MODULE_0__.getOptionalEnv)('SUPABASE_SERVICE_ROLE_KEY');\n    if (!serverKey) {\n        throw new Error('Missing Supabase server key. Set NEXT_PRIVATE_SUPABASE_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.');\n    }\n    return (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__.createClient)(url, serverKey);\n}\nconst supabase = createSupabaseServerClient();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vcGFja2FnZXMvZGIvc3JjL3NlcnZlci9pbmRleC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQW9EO0FBQ007QUFFMUQ7Ozs7O0NBS0MsR0FDTSxTQUFTRztJQUNkLE1BQU1DLE1BQU1GLHVEQUFVQSxDQUFDO0lBRXZCLHVFQUF1RTtJQUN2RSxNQUFNRyxZQUNKSiwyREFBY0EsQ0FBQyxnQ0FDZkEsMkRBQWNBLENBQUM7SUFFakIsSUFBSSxDQUFDSSxXQUFXO1FBQ2QsTUFBTSxJQUFJQyxNQUNSO0lBRUo7SUFFQSxPQUFPTixtRUFBWUEsQ0FBQ0ksS0FBS0M7QUFDM0I7QUFFTyxNQUFNRSxXQUFXSiw2QkFBNEIiLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb3NpYWhrZXJyaWNrL0Rlc2t0b3AvY29va2luZ19yZWNpcGVfYXBwL3BhY2thZ2VzL2RiL3NyYy9zZXJ2ZXIvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ1xuaW1wb3J0IHsgZ2V0T3B0aW9uYWxFbnYsIHJlcXVpcmVFbnYgfSBmcm9tICcuLi9zaGFyZWQvZW52J1xuXG4vKipcbiAqIFNlcnZlci1vbmx5IFN1cGFiYXNlIGNsaWVudC5cbiAqXG4gKiBOT1RFOiBUaGlzIGlzIGludGVudGlvbmFsbHkgTk9UIGF1dG8tZGV0ZWN0ZWQgYnkgaW1wb3J0cy5cbiAqIFlvdSBtdXN0IGltcG9ydCBmcm9tIGBAYWNtZS9kYi9zZXJ2ZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3VwYWJhc2VTZXJ2ZXJDbGllbnQoKSB7XG4gIGNvbnN0IHVybCA9IHJlcXVpcmVFbnYoJ05FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCcpXG5cbiAgLy8gS2VlcCBORVhUX1BSSVZBVEVfU1VQQUJBU0VfS0VZIGFzIHByaW1hcnkgdG8gYXZvaWQgYmVoYXZpb3IgY2hhbmdlcy5cbiAgY29uc3Qgc2VydmVyS2V5ID1cbiAgICBnZXRPcHRpb25hbEVudignTkVYVF9QUklWQVRFX1NVUEFCQVNFX0tFWScpID8/XG4gICAgZ2V0T3B0aW9uYWxFbnYoJ1NVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVknKVxuXG4gIGlmICghc2VydmVyS2V5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ01pc3NpbmcgU3VwYWJhc2Ugc2VydmVyIGtleS4gU2V0IE5FWFRfUFJJVkFURV9TVVBBQkFTRV9LRVkgKHByZWZlcnJlZCkgb3IgU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWS4nXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZUNsaWVudCh1cmwsIHNlcnZlcktleSlcbn1cblxuZXhwb3J0IGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlU3VwYWJhc2VTZXJ2ZXJDbGllbnQoKVxuIl0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsImdldE9wdGlvbmFsRW52IiwicmVxdWlyZUVudiIsImNyZWF0ZVN1cGFiYXNlU2VydmVyQ2xpZW50IiwidXJsIiwic2VydmVyS2V5IiwiRXJyb3IiLCJzdXBhYmFzZSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../packages/db/src/server/index.ts\n");

/***/ }),

/***/ "(rsc)/../../packages/db/src/shared/env.ts":
/*!*******************************************!*\
  !*** ../../packages/db/src/shared/env.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getOptionalEnv: () => (/* binding */ getOptionalEnv),\n/* harmony export */   requireEnv: () => (/* binding */ requireEnv)\n/* harmony export */ });\nfunction requireEnv(name) {\n    const value = process.env[name];\n    if (!value) {\n        throw new Error(`Missing env var ${name}`);\n    }\n    return value;\n}\nfunction getOptionalEnv(name) {\n    return process.env[name];\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vcGFja2FnZXMvZGIvc3JjL3NoYXJlZC9lbnYudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBTyxTQUFTQSxXQUFXQyxJQUFZO0lBQ3JDLE1BQU1DLFFBQVFDLFFBQVFDLEdBQUcsQ0FBQ0gsS0FBSztJQUMvQixJQUFJLENBQUNDLE9BQU87UUFDVixNQUFNLElBQUlHLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRUosTUFBTTtJQUMzQztJQUNBLE9BQU9DO0FBQ1Q7QUFFTyxTQUFTSSxlQUFlTCxJQUFZO0lBQ3pDLE9BQU9FLFFBQVFDLEdBQUcsQ0FBQ0gsS0FBSztBQUMxQiIsInNvdXJjZXMiOlsiL1VzZXJzL2pvc2lhaGtlcnJpY2svRGVza3RvcC9jb29raW5nX3JlY2lwZV9hcHAvcGFja2FnZXMvZGIvc3JjL3NoYXJlZC9lbnYudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIHJlcXVpcmVFbnYobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltuYW1lXVxuICBpZiAoIXZhbHVlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGVudiB2YXIgJHtuYW1lfWApXG4gIH1cbiAgcmV0dXJuIHZhbHVlXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRPcHRpb25hbEVudihuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICByZXR1cm4gcHJvY2Vzcy5lbnZbbmFtZV1cbn1cbiJdLCJuYW1lcyI6WyJyZXF1aXJlRW52IiwibmFtZSIsInZhbHVlIiwicHJvY2VzcyIsImVudiIsIkVycm9yIiwiZ2V0T3B0aW9uYWxFbnYiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/../../packages/db/src/shared/env.ts\n");

/***/ }),

/***/ "(rsc)/./app/api/recipes/route.ts":
/*!**********************************!*\
  !*** ./app/api/recipes/route.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/api/server.js\");\n/* harmony import */ var _acme_db_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @acme/db/server */ \"(rsc)/../../packages/db/src/server/index.ts\");\n\n\n// GET - List all recipes for authenticated user\nasync function GET(request) {\n    try {\n        const authHeader = request.headers.get('authorization');\n        if (!authHeader) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'No authorization header'\n            }, {\n                status: 401\n            });\n        }\n        const token = authHeader.replace('Bearer ', '');\n        const { data: { user }, error: authError } = await _acme_db_server__WEBPACK_IMPORTED_MODULE_1__.supabase.auth.getUser(token);\n        if (authError || !user) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Invalid token'\n            }, {\n                status: 401\n            });\n        }\n        const { data: recipes, error } = await _acme_db_server__WEBPACK_IMPORTED_MODULE_1__.supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', {\n            ascending: false\n        });\n        if (error) {\n            console.error('Error fetching recipes:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Failed to fetch recipes'\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            recipes\n        });\n    } catch (error) {\n        console.error('Error in GET /api/recipes:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Internal server error'\n        }, {\n            status: 500\n        });\n    }\n}\n// POST - Save a new recipe\nasync function POST(request) {\n    try {\n        const authHeader = request.headers.get('authorization');\n        if (!authHeader) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'No authorization header'\n            }, {\n                status: 401\n            });\n        }\n        const token = authHeader.replace('Bearer ', '');\n        const { data: { user }, error: authError } = await _acme_db_server__WEBPACK_IMPORTED_MODULE_1__.supabase.auth.getUser(token);\n        if (authError || !user) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Invalid token'\n            }, {\n                status: 401\n            });\n        }\n        const body = await request.json();\n        const { title, thumbnail, ingredients, instructions, platform, source, original_url, normalizedIngredients } = body;\n        console.log('📝 Saving recipe with normalized ingredients:', {\n            title,\n            ingredientCount: ingredients?.length,\n            normalizedCount: normalizedIngredients?.length,\n            sampleNormalized: normalizedIngredients?.[0]\n        });\n        if (!title || !ingredients || !instructions || !platform || !source) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Missing required fields'\n            }, {\n                status: 400\n            });\n        }\n        const { data: recipe, error } = await _acme_db_server__WEBPACK_IMPORTED_MODULE_1__.supabase.from('recipes').insert({\n            user_id: user.id,\n            title,\n            thumbnail: thumbnail || null,\n            ingredients,\n            instructions,\n            platform,\n            source,\n            original_url: original_url || null,\n            normalized_ingredients: normalizedIngredients || []\n        }).select().single();\n        if (error) {\n            console.error('Error saving recipe:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Failed to save recipe'\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            recipe\n        });\n    } catch (error) {\n        console.error('Error in POST /api/recipes:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Internal server error'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QU9oQyxxREFBWUEsQ0FBQ08sSUFBSSxDQUFDO2dCQUFFQyxPQUFPO1lBQTBCLEdBQUc7Z0JBQUVDLFFBQVE7WUFBSTtRQUMvRTtRQUVBLE1BQU0sRUFBRUcsTUFBTTRCLE1BQU0sRUFBRWhDLEtBQUssRUFBRSxHQUFHLE1BQU1QLHFEQUFRQSxDQUMzQ2lCLElBQUksQ0FBQyxXQUNMdUIsTUFBTSxDQUFDO1lBQ05DLFNBQVM3QixLQUFLUSxFQUFFO1lBQ2hCTTtZQUNBQyxXQUFXQSxhQUFhO1lBQ3hCQztZQUNBQztZQUNBQztZQUNBQztZQUNBQyxjQUFjQSxnQkFBZ0I7WUFDOUJVLHdCQUF3QlQseUJBQXlCLEVBQUU7UUFDckQsR0FDQ2YsTUFBTSxHQUNOeUIsTUFBTTtRQUVULElBQUlwQyxPQUFPO1lBQ1RnQixRQUFRaEIsS0FBSyxDQUFDLHdCQUF3QkE7WUFDdEMsT0FBT1IscURBQVlBLENBQUNPLElBQUksQ0FBQztnQkFBRUMsT0FBTztZQUF3QixHQUFHO2dCQUFFQyxRQUFRO1lBQUk7UUFDN0U7UUFFQSxPQUFPVCxxREFBWUEsQ0FBQ08sSUFBSSxDQUFDO1lBQUVpQztRQUFPO0lBQ3BDLEVBQUUsT0FBT2hDLE9BQU87UUFDZGdCLFFBQVFoQixLQUFLLENBQUMsK0JBQStCQTtRQUM3QyxPQUFPUixxREFBWUEsQ0FBQ08sSUFBSSxDQUFDO1lBQUVDLE9BQU87UUFBd0IsR0FBRztZQUFFQyxRQUFRO1FBQUk7SUFDN0U7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2pvc2lhaGtlcnJpY2svRGVza3RvcC9jb29raW5nX3JlY2lwZV9hcHAvYXBwcy93ZWIvYXBwL2FwaS9yZWNpcGVzL3JvdXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXF1ZXN0LCBOZXh0UmVzcG9uc2UgfSBmcm9tICduZXh0L3NlcnZlcic7XG5pbXBvcnQgeyBzdXBhYmFzZSB9IGZyb20gJ0BhY21lL2RiL3NlcnZlcic7XG5cbi8vIEdFVCAtIExpc3QgYWxsIHJlY2lwZXMgZm9yIGF1dGhlbnRpY2F0ZWQgdXNlclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGF1dGhIZWFkZXIgPSByZXF1ZXN0LmhlYWRlcnMuZ2V0KCdhdXRob3JpemF0aW9uJyk7XG4gICAgaWYgKCFhdXRoSGVhZGVyKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ05vIGF1dGhvcml6YXRpb24gaGVhZGVyJyB9LCB7IHN0YXR1czogNDAxIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHRva2VuID0gYXV0aEhlYWRlci5yZXBsYWNlKCdCZWFyZXIgJywgJycpO1xuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0sIGVycm9yOiBhdXRoRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcih0b2tlbik7XG4gICAgXG4gICAgaWYgKGF1dGhFcnJvciB8fCAhdXNlcikge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdJbnZhbGlkIHRva2VuJyB9LCB7IHN0YXR1czogNDAxIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZGF0YTogcmVjaXBlcywgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgncmVjaXBlcycpXG4gICAgICAuc2VsZWN0KCcqJylcbiAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXIuaWQpXG4gICAgICAub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIHJlY2lwZXM6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggcmVjaXBlcycgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyByZWNpcGVzIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIEdFVCAvYXBpL3JlY2lwZXM6JywgZXJyb3IpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG5cbi8vIFBPU1QgLSBTYXZlIGEgbmV3IHJlY2lwZVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxdWVzdDogTmV4dFJlcXVlc3QpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gcmVxdWVzdC5oZWFkZXJzLmdldCgnYXV0aG9yaXphdGlvbicpO1xuICAgIGlmICghYXV0aEhlYWRlcikge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdObyBhdXRob3JpemF0aW9uIGhlYWRlcicgfSwgeyBzdGF0dXM6IDQwMSB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB0b2tlbiA9IGF1dGhIZWFkZXIucmVwbGFjZSgnQmVhcmVyICcsICcnKTtcbiAgICBjb25zdCB7IGRhdGE6IHsgdXNlciB9LCBlcnJvcjogYXV0aEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIodG9rZW4pO1xuICAgIFxuICAgIGlmIChhdXRoRXJyb3IgfHwgIXVzZXIpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnSW52YWxpZCB0b2tlbicgfSwgeyBzdGF0dXM6IDQwMSB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVxdWVzdC5qc29uKCk7XG4gICAgY29uc3QgeyB0aXRsZSwgdGh1bWJuYWlsLCBpbmdyZWRpZW50cywgaW5zdHJ1Y3Rpb25zLCBwbGF0Zm9ybSwgc291cmNlLCBvcmlnaW5hbF91cmwsIG5vcm1hbGl6ZWRJbmdyZWRpZW50cyB9ID0gYm9keTtcbiAgICBcbiAgICBjb25zb2xlLmxvZygn8J+TnSBTYXZpbmcgcmVjaXBlIHdpdGggbm9ybWFsaXplZCBpbmdyZWRpZW50czonLCB7XG4gICAgICB0aXRsZSxcbiAgICAgIGluZ3JlZGllbnRDb3VudDogaW5ncmVkaWVudHM/Lmxlbmd0aCxcbiAgICAgIG5vcm1hbGl6ZWRDb3VudDogbm9ybWFsaXplZEluZ3JlZGllbnRzPy5sZW5ndGgsXG4gICAgICBzYW1wbGVOb3JtYWxpemVkOiBub3JtYWxpemVkSW5ncmVkaWVudHM/LlswXVxuICAgIH0pO1xuXG4gICAgaWYgKCF0aXRsZSB8fCAhaW5ncmVkaWVudHMgfHwgIWluc3RydWN0aW9ucyB8fCAhcGxhdGZvcm0gfHwgIXNvdXJjZSkge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkcycgfSwgeyBzdGF0dXM6IDQwMCB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGRhdGE6IHJlY2lwZSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgncmVjaXBlcycpXG4gICAgICAuaW5zZXJ0KHtcbiAgICAgICAgdXNlcl9pZDogdXNlci5pZCxcbiAgICAgICAgdGl0bGUsXG4gICAgICAgIHRodW1ibmFpbDogdGh1bWJuYWlsIHx8IG51bGwsXG4gICAgICAgIGluZ3JlZGllbnRzLFxuICAgICAgICBpbnN0cnVjdGlvbnMsXG4gICAgICAgIHBsYXRmb3JtLFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIG9yaWdpbmFsX3VybDogb3JpZ2luYWxfdXJsIHx8IG51bGwsXG4gICAgICAgIG5vcm1hbGl6ZWRfaW5ncmVkaWVudHM6IG5vcm1hbGl6ZWRJbmdyZWRpZW50cyB8fCBbXVxuICAgICAgfSlcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLnNpbmdsZSgpO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzYXZpbmcgcmVjaXBlOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnRmFpbGVkIHRvIHNhdmUgcmVjaXBlJyB9LCB7IHN0YXR1czogNTAwIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IHJlY2lwZSB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBQT1NUIC9hcGkvcmVjaXBlczonLCBlcnJvcik7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn0gIl0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsInN1cGFiYXNlIiwiR0VUIiwicmVxdWVzdCIsImF1dGhIZWFkZXIiLCJoZWFkZXJzIiwiZ2V0IiwianNvbiIsImVycm9yIiwic3RhdHVzIiwidG9rZW4iLCJyZXBsYWNlIiwiZGF0YSIsInVzZXIiLCJhdXRoRXJyb3IiLCJhdXRoIiwiZ2V0VXNlciIsInJlY2lwZXMiLCJmcm9tIiwic2VsZWN0IiwiZXEiLCJpZCIsIm9yZGVyIiwiYXNjZW5kaW5nIiwiY29uc29sZSIsIlBPU1QiLCJib2R5IiwidGl0bGUiLCJ0aHVtYm5haWwiLCJpbmdyZWRpZW50cyIsImluc3RydWN0aW9ucyIsInBsYXRmb3JtIiwic291cmNlIiwib3JpZ2luYWxfdXJsIiwibm9ybWFsaXplZEluZ3JlZGllbnRzIiwibG9nIiwiaW5ncmVkaWVudENvdW50IiwibGVuZ3RoIiwibm9ybWFsaXplZENvdW50Iiwic2FtcGxlTm9ybWFsaXplZCIsInJlY2lwZSIsImluc2VydCIsInVzZXJfaWQiLCJub3JtYWxpemVkX2luZ3JlZGllbnRzIiwic2luZ2xlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/recipes/route.ts\n");

/***/ }),

/***/ "(ssr)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!********************************************************************************************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \********************************************************************************************************************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0","vendor-chunks/tr46@0.0.3","vendor-chunks/@supabase+auth-js@2.69.1","vendor-chunks/@supabase+realtime-js@2.11.2","vendor-chunks/@supabase+postgrest-js@1.19.4","vendor-chunks/@supabase+node-fetch@2.6.15","vendor-chunks/whatwg-url@5.0.0","vendor-chunks/@supabase+storage-js@2.7.1","vendor-chunks/@supabase+supabase-js@2.49.8","vendor-chunks/@supabase+functions-js@2.4.4","vendor-chunks/webidl-conversions@3.0.1"], () => (__webpack_exec__("(rsc)/../../node_modules/.pnpm/next@15.3.2_@babel+core@7.27.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Frecipes%2Froute&page=%2Fapi%2Frecipes%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Frecipes%2Froute.ts&appDir=%2FUsers%2Fjosiahkerrick%2FDesktop%2Fcooking_recipe_app%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fjosiahkerrick%2FDesktop%2Fcooking_recipe_app%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();