import mongoose from "mongoose";

/**
 * Mongoose plugin to measure and log high-precision execution times for:
 * - Queries (find, update, delete, etc.)
 * - Aggregations
 * - Document Saves
 */
const dbPerformancePlugin = (schema) => {
    // --- Query Hooks ---
    const queryMethods = [
        'find', 'findOne', 'count', 'countDocuments', 'estimatedDocumentCount',
        'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete',
        'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne'
    ];

    queryMethods.forEach(method => {
        schema.pre(method, function () {
            this._startTime = performance.now();
        });

        schema.post(method, function () {
            if (this._startTime) {
                const duration = performance.now() - this._startTime;
                const modelName = this.model?.modelName || "UnknownModel";
                console.log(`[DB Query] ${modelName}.${this.op} - Time taken: ${duration.toFixed(3)} ms`);
            }
        });
    });

    // --- Aggregation Hooks ---
    schema.pre('aggregate', function () {
        this._startTime = performance.now();
    });

    schema.post('aggregate', function () {
        if (this._startTime) {
            const duration = performance.now() - this._startTime;
            const modelName = this.model()?.modelName || "UnknownModel";
            console.log(`[DB Aggregate] ${modelName} - Time taken: ${duration.toFixed(3)} ms`);
        }
    });

    // --- Document Hooks (Save/Remove) ---
    schema.pre('save', function () {
        this._startTime = performance.now();
    });

    schema.post('save', function () {
        if (this._startTime) {
            const duration = performance.now() - this._startTime;
            const modelName = this.constructor.modelName || "UnknownModel";
            console.log(`[DB Save] ${modelName} - Time taken: ${duration.toFixed(3)} ms`);
        }
    });
};

// Apply as a global plugin
mongoose.plugin(dbPerformancePlugin);

export default dbPerformancePlugin;
