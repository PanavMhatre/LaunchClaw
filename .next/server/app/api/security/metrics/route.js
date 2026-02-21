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
exports.id = "app/api/security/metrics/route";
exports.ids = ["app/api/security/metrics/route"];
exports.modules = {

/***/ "(rsc)/./app/api/security/metrics/route.ts":
/*!*******************************************!*\
  !*** ./app/api/security/metrics/route.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   dynamic: () => (/* binding */ dynamic),\n/* harmony export */   runtime: () => (/* binding */ runtime)\n/* harmony export */ });\n/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fs/promises */ \"fs/promises\");\n/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! os */ \"os\");\n/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(os__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\n\n\nconst sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));\nfunction readCpuTotals() {\n    const cores = os__WEBPACK_IMPORTED_MODULE_1___default().cpus();\n    let idle = 0;\n    let total = 0;\n    for (const core of cores){\n        idle += core.times.idle;\n        total += core.times.user + core.times.nice + core.times.sys + core.times.irq + core.times.idle;\n    }\n    return {\n        idle,\n        total\n    };\n}\nasync function getCpuUsagePercent() {\n    const start = readCpuTotals();\n    await sleep(120);\n    const end = readCpuTotals();\n    const idleDelta = end.idle - start.idle;\n    const totalDelta = end.total - start.total;\n    if (totalDelta <= 0) return 0;\n    const usage = (1 - idleDelta / totalDelta) * 100;\n    return Math.max(0, Math.min(100, usage));\n}\nasync function getStorageUsage() {\n    try {\n        const stats = await fs_promises__WEBPACK_IMPORTED_MODULE_0___default().statfs(process.cwd());\n        if (!stats) {\n            return null;\n        }\n        const blockSize = Number(stats.bsize);\n        const totalBlocks = Number(stats.blocks);\n        const availableBlocks = Number(stats.bavail);\n        if (!Number.isFinite(blockSize) || !Number.isFinite(totalBlocks) || !Number.isFinite(availableBlocks)) {\n            return null;\n        }\n        const totalBytes = blockSize * totalBlocks;\n        const availableBytes = blockSize * availableBlocks;\n        const usedBytes = Math.max(0, totalBytes - availableBytes);\n        const capacityPercent = totalBytes > 0 ? usedBytes / totalBytes * 100 : 0;\n        if (!Number.isFinite(totalBytes) || !Number.isFinite(usedBytes) || !Number.isFinite(capacityPercent)) {\n            return null;\n        }\n        return {\n            totalGb: totalBytes / 1024 ** 3,\n            usedGb: usedBytes / 1024 ** 3,\n            percent: capacityPercent\n        };\n    } catch  {\n        return null;\n    }\n}\nconst runtime = \"nodejs\";\nconst dynamic = \"force-dynamic\";\nasync function GET() {\n    const cpuPercent = await getCpuUsagePercent();\n    const totalMem = os__WEBPACK_IMPORTED_MODULE_1___default().totalmem();\n    const freeMem = os__WEBPACK_IMPORTED_MODULE_1___default().freemem();\n    const usedMem = totalMem - freeMem;\n    const ramPercent = totalMem > 0 ? usedMem / totalMem * 100 : 0;\n    const storage = await getStorageUsage();\n    return next_server__WEBPACK_IMPORTED_MODULE_2__.NextResponse.json({\n        cpuPercent,\n        ramPercent,\n        ramUsedGb: usedMem / 1024 ** 3,\n        ramTotalGb: totalMem / 1024 ** 3,\n        storagePercent: storage?.percent ?? 0,\n        storageUsedGb: storage?.usedGb ?? 0,\n        storageTotalGb: storage?.totalGb ?? 0,\n        storageAvailable: Boolean(storage),\n        updatedAt: new Date().toISOString()\n    }, {\n        headers: {\n            \"Cache-Control\": \"no-store\"\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3NlY3VyaXR5L21ldHJpY3Mvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBNEI7QUFDVDtBQUN1QjtBQUUxQyxNQUFNRyxRQUFRLENBQUNDLEtBQWUsSUFBSUMsUUFBUSxDQUFDQyxVQUFZQyxXQUFXRCxTQUFTRjtBQU8zRSxTQUFTSTtJQUNQLE1BQU1DLFFBQVFSLDhDQUFPO0lBQ3JCLElBQUlVLE9BQU87SUFDWCxJQUFJQyxRQUFRO0lBRVosS0FBSyxNQUFNQyxRQUFRSixNQUFPO1FBQ3hCRSxRQUFRRSxLQUFLQyxLQUFLLENBQUNILElBQUk7UUFDdkJDLFNBQVNDLEtBQUtDLEtBQUssQ0FBQ0MsSUFBSSxHQUFHRixLQUFLQyxLQUFLLENBQUNFLElBQUksR0FBR0gsS0FBS0MsS0FBSyxDQUFDRyxHQUFHLEdBQUdKLEtBQUtDLEtBQUssQ0FBQ0ksR0FBRyxHQUFHTCxLQUFLQyxLQUFLLENBQUNILElBQUk7SUFDaEc7SUFFQSxPQUFPO1FBQUVBO1FBQU1DO0lBQU07QUFDdkI7QUFFQSxlQUFlTztJQUNiLE1BQU1DLFFBQVFaO0lBQ2QsTUFBTUwsTUFBTTtJQUNaLE1BQU1rQixNQUFNYjtJQUVaLE1BQU1jLFlBQVlELElBQUlWLElBQUksR0FBR1MsTUFBTVQsSUFBSTtJQUN2QyxNQUFNWSxhQUFhRixJQUFJVCxLQUFLLEdBQUdRLE1BQU1SLEtBQUs7SUFFMUMsSUFBSVcsY0FBYyxHQUFHLE9BQU87SUFDNUIsTUFBTUMsUUFBUSxDQUFDLElBQUlGLFlBQVlDLFVBQVMsSUFBSztJQUM3QyxPQUFPRSxLQUFLQyxHQUFHLENBQUMsR0FBR0QsS0FBS0UsR0FBRyxDQUFDLEtBQUtIO0FBQ25DO0FBRUEsZUFBZUk7SUFDYixJQUFJO1FBQ0YsTUFBTUMsUUFBUSxNQUFNN0IseURBQVMsQ0FBQytCLFFBQVFDLEdBQUc7UUFDekMsSUFBSSxDQUFDSCxPQUFPO1lBQ1YsT0FBTztRQUNUO1FBRUEsTUFBTUksWUFBWUMsT0FBT0wsTUFBTU0sS0FBSztRQUNwQyxNQUFNQyxjQUFjRixPQUFPTCxNQUFNUSxNQUFNO1FBQ3ZDLE1BQU1DLGtCQUFrQkosT0FBT0wsTUFBTVUsTUFBTTtRQUMzQyxJQUFJLENBQUNMLE9BQU9NLFFBQVEsQ0FBQ1AsY0FBYyxDQUFDQyxPQUFPTSxRQUFRLENBQUNKLGdCQUFnQixDQUFDRixPQUFPTSxRQUFRLENBQUNGLGtCQUFrQjtZQUNyRyxPQUFPO1FBQ1Q7UUFFQSxNQUFNRyxhQUFhUixZQUFZRztRQUMvQixNQUFNTSxpQkFBaUJULFlBQVlLO1FBQ25DLE1BQU1LLFlBQVlsQixLQUFLQyxHQUFHLENBQUMsR0FBR2UsYUFBYUM7UUFDM0MsTUFBTUUsa0JBQWtCSCxhQUFhLElBQUksWUFBYUEsYUFBYyxNQUFNO1FBRTFFLElBQUksQ0FBQ1AsT0FBT00sUUFBUSxDQUFDQyxlQUFlLENBQUNQLE9BQU9NLFFBQVEsQ0FBQ0csY0FBYyxDQUFDVCxPQUFPTSxRQUFRLENBQUNJLGtCQUFrQjtZQUNwRyxPQUFPO1FBQ1Q7UUFFQSxPQUFPO1lBQ0xDLFNBQVNKLGFBQWMsUUFBUTtZQUMvQkssUUFBUUgsWUFBYSxRQUFRO1lBQzdCSSxTQUFTSDtRQUNYO0lBQ0YsRUFBRSxPQUFNO1FBQ04sT0FBTztJQUNUO0FBQ0Y7QUFFTyxNQUFNSSxVQUFVLFNBQVE7QUFDeEIsTUFBTUMsVUFBVSxnQkFBZTtBQUUvQixlQUFlQztJQUNwQixNQUFNQyxhQUFhLE1BQU1oQztJQUN6QixNQUFNaUMsV0FBV25ELGtEQUFXO0lBQzVCLE1BQU1xRCxVQUFVckQsaURBQVU7SUFDMUIsTUFBTXVELFVBQVVKLFdBQVdFO0lBQzNCLE1BQU1HLGFBQWFMLFdBQVcsSUFBSSxVQUFXQSxXQUFZLE1BQU07SUFFL0QsTUFBTU0sVUFBVSxNQUFNOUI7SUFFdEIsT0FBTzFCLHFEQUFZQSxDQUFDeUQsSUFBSSxDQUN0QjtRQUNFUjtRQUNBTTtRQUNBRyxXQUFXSixVQUFXLFFBQVE7UUFDOUJLLFlBQVlULFdBQVksUUFBUTtRQUNoQ1UsZ0JBQWdCSixTQUFTWCxXQUFXO1FBQ3BDZ0IsZUFBZUwsU0FBU1osVUFBVTtRQUNsQ2tCLGdCQUFnQk4sU0FBU2IsV0FBVztRQUNwQ29CLGtCQUFrQkMsUUFBUVI7UUFDMUJTLFdBQVcsSUFBSUMsT0FBT0MsV0FBVztJQUNuQyxHQUNBO1FBQUVDLFNBQVM7WUFBRSxpQkFBaUI7UUFBVztJQUFFO0FBRS9DIiwic291cmNlcyI6WyIvVXNlcnMvcGFuYXZtaGF0cmUvRGVza3RvcC9Db2RpbmcvTGF1bmNoQ2xhdy9hcHAvYXBpL3NlY3VyaXR5L21ldHJpY3Mvcm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gXCJmcy9wcm9taXNlc1wiXG5pbXBvcnQgb3MgZnJvbSBcIm9zXCJcbmltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiXG5cbmNvbnN0IHNsZWVwID0gKG1zOiBudW1iZXIpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSlcblxudHlwZSBDcHVUb3RhbHMgPSB7XG4gIGlkbGU6IG51bWJlclxuICB0b3RhbDogbnVtYmVyXG59XG5cbmZ1bmN0aW9uIHJlYWRDcHVUb3RhbHMoKTogQ3B1VG90YWxzIHtcbiAgY29uc3QgY29yZXMgPSBvcy5jcHVzKClcbiAgbGV0IGlkbGUgPSAwXG4gIGxldCB0b3RhbCA9IDBcblxuICBmb3IgKGNvbnN0IGNvcmUgb2YgY29yZXMpIHtcbiAgICBpZGxlICs9IGNvcmUudGltZXMuaWRsZVxuICAgIHRvdGFsICs9IGNvcmUudGltZXMudXNlciArIGNvcmUudGltZXMubmljZSArIGNvcmUudGltZXMuc3lzICsgY29yZS50aW1lcy5pcnEgKyBjb3JlLnRpbWVzLmlkbGVcbiAgfVxuXG4gIHJldHVybiB7IGlkbGUsIHRvdGFsIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0Q3B1VXNhZ2VQZXJjZW50KCkge1xuICBjb25zdCBzdGFydCA9IHJlYWRDcHVUb3RhbHMoKVxuICBhd2FpdCBzbGVlcCgxMjApXG4gIGNvbnN0IGVuZCA9IHJlYWRDcHVUb3RhbHMoKVxuXG4gIGNvbnN0IGlkbGVEZWx0YSA9IGVuZC5pZGxlIC0gc3RhcnQuaWRsZVxuICBjb25zdCB0b3RhbERlbHRhID0gZW5kLnRvdGFsIC0gc3RhcnQudG90YWxcblxuICBpZiAodG90YWxEZWx0YSA8PSAwKSByZXR1cm4gMFxuICBjb25zdCB1c2FnZSA9ICgxIC0gaWRsZURlbHRhIC8gdG90YWxEZWx0YSkgKiAxMDBcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDEwMCwgdXNhZ2UpKVxufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRTdG9yYWdlVXNhZ2UoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5zdGF0ZnMocHJvY2Vzcy5jd2QoKSlcbiAgICBpZiAoIXN0YXRzKSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIGNvbnN0IGJsb2NrU2l6ZSA9IE51bWJlcihzdGF0cy5ic2l6ZSlcbiAgICBjb25zdCB0b3RhbEJsb2NrcyA9IE51bWJlcihzdGF0cy5ibG9ja3MpXG4gICAgY29uc3QgYXZhaWxhYmxlQmxvY2tzID0gTnVtYmVyKHN0YXRzLmJhdmFpbClcbiAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShibG9ja1NpemUpIHx8ICFOdW1iZXIuaXNGaW5pdGUodG90YWxCbG9ja3MpIHx8ICFOdW1iZXIuaXNGaW5pdGUoYXZhaWxhYmxlQmxvY2tzKSkge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICBjb25zdCB0b3RhbEJ5dGVzID0gYmxvY2tTaXplICogdG90YWxCbG9ja3NcbiAgICBjb25zdCBhdmFpbGFibGVCeXRlcyA9IGJsb2NrU2l6ZSAqIGF2YWlsYWJsZUJsb2Nrc1xuICAgIGNvbnN0IHVzZWRCeXRlcyA9IE1hdGgubWF4KDAsIHRvdGFsQnl0ZXMgLSBhdmFpbGFibGVCeXRlcylcbiAgICBjb25zdCBjYXBhY2l0eVBlcmNlbnQgPSB0b3RhbEJ5dGVzID4gMCA/ICh1c2VkQnl0ZXMgLyB0b3RhbEJ5dGVzKSAqIDEwMCA6IDBcblxuICAgIGlmICghTnVtYmVyLmlzRmluaXRlKHRvdGFsQnl0ZXMpIHx8ICFOdW1iZXIuaXNGaW5pdGUodXNlZEJ5dGVzKSB8fCAhTnVtYmVyLmlzRmluaXRlKGNhcGFjaXR5UGVyY2VudCkpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvdGFsR2I6IHRvdGFsQnl0ZXMgLyAoMTAyNCAqKiAzKSxcbiAgICAgIHVzZWRHYjogdXNlZEJ5dGVzIC8gKDEwMjQgKiogMyksXG4gICAgICBwZXJjZW50OiBjYXBhY2l0eVBlcmNlbnQsXG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG5cbmV4cG9ydCBjb25zdCBydW50aW1lID0gXCJub2RlanNcIlxuZXhwb3J0IGNvbnN0IGR5bmFtaWMgPSBcImZvcmNlLWR5bmFtaWNcIlxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKCkge1xuICBjb25zdCBjcHVQZXJjZW50ID0gYXdhaXQgZ2V0Q3B1VXNhZ2VQZXJjZW50KClcbiAgY29uc3QgdG90YWxNZW0gPSBvcy50b3RhbG1lbSgpXG4gIGNvbnN0IGZyZWVNZW0gPSBvcy5mcmVlbWVtKClcbiAgY29uc3QgdXNlZE1lbSA9IHRvdGFsTWVtIC0gZnJlZU1lbVxuICBjb25zdCByYW1QZXJjZW50ID0gdG90YWxNZW0gPiAwID8gKHVzZWRNZW0gLyB0b3RhbE1lbSkgKiAxMDAgOiAwXG5cbiAgY29uc3Qgc3RvcmFnZSA9IGF3YWl0IGdldFN0b3JhZ2VVc2FnZSgpXG5cbiAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgIHtcbiAgICAgIGNwdVBlcmNlbnQsXG4gICAgICByYW1QZXJjZW50LFxuICAgICAgcmFtVXNlZEdiOiB1c2VkTWVtIC8gKDEwMjQgKiogMyksXG4gICAgICByYW1Ub3RhbEdiOiB0b3RhbE1lbSAvICgxMDI0ICoqIDMpLFxuICAgICAgc3RvcmFnZVBlcmNlbnQ6IHN0b3JhZ2U/LnBlcmNlbnQgPz8gMCxcbiAgICAgIHN0b3JhZ2VVc2VkR2I6IHN0b3JhZ2U/LnVzZWRHYiA/PyAwLFxuICAgICAgc3RvcmFnZVRvdGFsR2I6IHN0b3JhZ2U/LnRvdGFsR2IgPz8gMCxcbiAgICAgIHN0b3JhZ2VBdmFpbGFibGU6IEJvb2xlYW4oc3RvcmFnZSksXG4gICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB9LFxuICAgIHsgaGVhZGVyczogeyBcIkNhY2hlLUNvbnRyb2xcIjogXCJuby1zdG9yZVwiIH0gfSxcbiAgKVxufVxuIl0sIm5hbWVzIjpbImZzIiwib3MiLCJOZXh0UmVzcG9uc2UiLCJzbGVlcCIsIm1zIiwiUHJvbWlzZSIsInJlc29sdmUiLCJzZXRUaW1lb3V0IiwicmVhZENwdVRvdGFscyIsImNvcmVzIiwiY3B1cyIsImlkbGUiLCJ0b3RhbCIsImNvcmUiLCJ0aW1lcyIsInVzZXIiLCJuaWNlIiwic3lzIiwiaXJxIiwiZ2V0Q3B1VXNhZ2VQZXJjZW50Iiwic3RhcnQiLCJlbmQiLCJpZGxlRGVsdGEiLCJ0b3RhbERlbHRhIiwidXNhZ2UiLCJNYXRoIiwibWF4IiwibWluIiwiZ2V0U3RvcmFnZVVzYWdlIiwic3RhdHMiLCJzdGF0ZnMiLCJwcm9jZXNzIiwiY3dkIiwiYmxvY2tTaXplIiwiTnVtYmVyIiwiYnNpemUiLCJ0b3RhbEJsb2NrcyIsImJsb2NrcyIsImF2YWlsYWJsZUJsb2NrcyIsImJhdmFpbCIsImlzRmluaXRlIiwidG90YWxCeXRlcyIsImF2YWlsYWJsZUJ5dGVzIiwidXNlZEJ5dGVzIiwiY2FwYWNpdHlQZXJjZW50IiwidG90YWxHYiIsInVzZWRHYiIsInBlcmNlbnQiLCJydW50aW1lIiwiZHluYW1pYyIsIkdFVCIsImNwdVBlcmNlbnQiLCJ0b3RhbE1lbSIsInRvdGFsbWVtIiwiZnJlZU1lbSIsImZyZWVtZW0iLCJ1c2VkTWVtIiwicmFtUGVyY2VudCIsInN0b3JhZ2UiLCJqc29uIiwicmFtVXNlZEdiIiwicmFtVG90YWxHYiIsInN0b3JhZ2VQZXJjZW50Iiwic3RvcmFnZVVzZWRHYiIsInN0b3JhZ2VUb3RhbEdiIiwic3RvcmFnZUF2YWlsYWJsZSIsIkJvb2xlYW4iLCJ1cGRhdGVkQXQiLCJEYXRlIiwidG9JU09TdHJpbmciLCJoZWFkZXJzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/security/metrics/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsecurity%2Fmetrics%2Froute&page=%2Fapi%2Fsecurity%2Fmetrics%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsecurity%2Fmetrics%2Froute.ts&appDir=%2FUsers%2Fpanavmhatre%2FDesktop%2FCoding%2FLaunchClaw%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fpanavmhatre%2FDesktop%2FCoding%2FLaunchClaw&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsecurity%2Fmetrics%2Froute&page=%2Fapi%2Fsecurity%2Fmetrics%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsecurity%2Fmetrics%2Froute.ts&appDir=%2FUsers%2Fpanavmhatre%2FDesktop%2FCoding%2FLaunchClaw%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fpanavmhatre%2FDesktop%2FCoding%2FLaunchClaw&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_panavmhatre_Desktop_Coding_LaunchClaw_app_api_security_metrics_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/security/metrics/route.ts */ \"(rsc)/./app/api/security/metrics/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/security/metrics/route\",\n        pathname: \"/api/security/metrics\",\n        filename: \"route\",\n        bundlePath: \"app/api/security/metrics/route\"\n    },\n    resolvedPagePath: \"/Users/panavmhatre/Desktop/Coding/LaunchClaw/app/api/security/metrics/route.ts\",\n    nextConfigOutput,\n    userland: _Users_panavmhatre_Desktop_Coding_LaunchClaw_app_api_security_metrics_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZzZWN1cml0eSUyRm1ldHJpY3MlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnNlY3VyaXR5JTJGbWV0cmljcyUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRnNlY3VyaXR5JTJGbWV0cmljcyUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnBhbmF2bWhhdHJlJTJGRGVza3RvcCUyRkNvZGluZyUyRkxhdW5jaENsYXclMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGcGFuYXZtaGF0cmUlMkZEZXNrdG9wJTJGQ29kaW5nJTJGTGF1bmNoQ2xhdyZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDOEI7QUFDM0c7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9wYW5hdm1oYXRyZS9EZXNrdG9wL0NvZGluZy9MYXVuY2hDbGF3L2FwcC9hcGkvc2VjdXJpdHkvbWV0cmljcy9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvc2VjdXJpdHkvbWV0cmljcy9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL3NlY3VyaXR5L21ldHJpY3NcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL3NlY3VyaXR5L21ldHJpY3Mvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvcGFuYXZtaGF0cmUvRGVza3RvcC9Db2RpbmcvTGF1bmNoQ2xhdy9hcHAvYXBpL3NlY3VyaXR5L21ldHJpY3Mvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsecurity%2Fmetrics%2Froute&page=%2Fapi%2Fsecurity%2Fmetrics%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsecurity%2Fmetrics%2Froute.ts&appDir=%2FUsers%2Fpanavmhatre%2FDesktop%2FCoding%2FLaunchClaw%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fpanavmhatre%2FDesktop%2FCoding%2FLaunchClaw&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
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

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("fs/promises");

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

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsecurity%2Fmetrics%2Froute&page=%2Fapi%2Fsecurity%2Fmetrics%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsecurity%2Fmetrics%2Froute.ts&appDir=%2FUsers%2Fpanavmhatre%2FDesktop%2FCoding%2FLaunchClaw%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fpanavmhatre%2FDesktop%2FCoding%2FLaunchClaw&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();