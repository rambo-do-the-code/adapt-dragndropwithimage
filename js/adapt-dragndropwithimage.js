define([
    'core/js/adapt',
    './dragndropwithimageView',
    'core/js/models/questionModel',
    './dragndropwithimageModel'
], function(Adapt, DragndropwithimageView, QuestionModel, DragndropwithimageModel) {

    return Adapt.register("dragndropwithimage", {
        view: DragndropwithimageView,
        model: DragndropwithimageModel
    });

});
