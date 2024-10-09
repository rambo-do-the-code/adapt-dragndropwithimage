import QuestionModel from 'core/js/models/questionModel';

export default class DragndropwithimageModel extends QuestionModel {
  get score() {
    if (!this.get('_hasItemScoring')) { return this.get('_isCorrect') ? this.maxScore : 0; }
    let _score = 0;
    const items = this.get('_items');
    items.forEach((item) => {
      const { accepted, _userAnswer } = item;
      const _acceptedSrc = accepted.map((item) => item.src);

      _score += _.intersection(_acceptedSrc, _userAnswer).length;

    });
    return _score;
  }

  get maxScore() {
    if (!this.get('_hasItemScoring')) { return this.get('_questionWeight'); }
    let _maxScore = 0;
    const items = this.get('_items');
    items.forEach((item) => {
      const { accepted } = item;
      const _acceptedSrc = accepted.map((item) => item.src);
      _maxScore += _acceptedSrc.length;
    });

    return _maxScore;

  }
}
