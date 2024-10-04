define([
  "coreJS/adapt",
  "coreViews/questionView",
  "libraries/jquery-ui.min",
  "libraries/jquery.ui.touch-punch",
], function (Adapt, QuestionView, JQueryUI, TouchPunch) {
  const DragndropwithimageView = QuestionView.extend({
    events: {
      "dragcreate .ui-draggable": "onDragCreate",
      "dragstart .ui-draggable": "onDragStart",
      "drag .ui-draggable": "onDrag",
      "dragstop .ui-draggable": "onDragStop",
      "drop .ui-droppable": "onDrop",
      "dropout .ui-droppable": "onDropOut",
      "dropover .ui-droppable": "onDropOver",
    },

    /** ************************************ SETUP METHODS **************************************/

    setupQuestion: function () {
      this.containerClass = ".dragndropwi__widget";
      this.$scrollElement = $(window);
      this.animationTime = 300;
      this.animationDelay = 100;

      // Create a single, random array of all available answers
      const possibleAnswers = _.shuffle(this.getAnswers(true));
      this.model.set("_possibleAnswers", possibleAnswers);

      // Make sure each item's accepted answer is an array - even single values
      // This simplifies future operations
      _.each(this.model.get("_items"), function (item) {
        _.each(item.accepted, function (mraccepted) {
          let accepted = mraccepted.src;
          if (typeof accepted === "string") accepted = [accepted];
        });
      });
    },

    onQuestionRendered: function () {
      this.setupDragAndDropItems();
      this.restoreUserAnswer();
      this.setReadyStatus();
    },

    setupDragAndDropItems: function () {
      const $draggables = this.$(".dragndropwi-answer");
      const $droppables = this.$(".dragndropwi-droppable");

      $draggables.draggable({
        containment: this.$(this.containerClass),
        snap: ".ui-state-enabled",
        snapMode: "inner",
        snapTolerance: 12,
      });

      // Activate droppables and set heights from draggable heights
      const hItem = $draggables.height();

      $droppables
        .droppable({
          activeClass: "ui-state-active",
          tolerance: "intersect",
        })
        .height(hItem);

      // Set widths of all drag and drop items according to the widest element
      const $items = this.$(".dragndropwi-item");
      const wMax = this.getMaxWidth($items);
      $items.width(wMax);

      // Store original position of draggables
      _.each($draggables, function (draggable) {
        const $draggable = $(draggable);
        $draggable.data({
          originalPosition: { top: 0, left: 0 },
          position: $draggable.offset(),
        });
      });
    },

    restoreUserAnswer: function () {
      if (!this.model.get("_isSubmitted")) return;

      const answers = this.getAnswers(true);
      const userAnswers = this.model.get("_userAnswer");
      const $droppables = this.$(".ui-droppable");
      let i = -1;
      if (userAnswers) {
        _.each(this.model.get("_items"), function (item) {
          _.each(item.accepted, function (mraccepted) {
            const theaccepted = mraccepted.src;
          });

          item._userAnswer = [];
          _.each(item.accepted, function () {
            i++;
            item._userAnswer.push(answers[userAnswers[i]]);
          });
        });

        _.each(
          userAnswers,
          function (answerIndex, i) {
            if (answerIndex > -1) {
              const answer = answers[answerIndex];
              const $draggable = this.getDraggableByText(answer);
              const $droppable = $droppables.eq(i);
              this.placeDraggable($draggable, $droppable, 0);
            }
          },
          this
        );
      }

      this.setQuestionAsSubmitted();
      this.markQuestion();
      this.setScore();
      this.showMarking();
      this.setupFeedback();
    },

    /** ************************************ HELPER METHODS **************************************/

    getMaxWidth: function ($collection) {
      let wMax = 0;
      for (let i = 0; i < $collection.length; i++) {
        const w = $collection.eq(i).width();
        if (w > wMax) wMax = w;
      }
      return wMax + 1;
    },

    getDraggableByText: function (text) {
      const draggable = _.find(
        this.$(".dragndropwi-answer"),
        function (draggable) {
          const $draggable = $(draggable);
          return $draggable.text() === text;
        }
      );

      return $(draggable);
    },

    getAnswers: function (includeDummyAnswers) {
      let answers = [];
      _.each(this.model.get("_items"), function (item) {
        _.each(item.accepted, function (mraccepted) {
          const accepted = mraccepted.src;
          answers = answers.concat(accepted);
        });
      });

      if (includeDummyAnswers) {
        _.each(this.model.get("dummyAnswers"), function (mrdummy) {
          const dummyAnswers = mrdummy.src;
          if (dummyAnswers) answers = answers.concat(dummyAnswers);
        });
      }

      return answers;
    },

    /** ************************************ DRAG AND DROP METHODS **************************************/

    onDragCreate: function (e) {
      const $draggable = $(e.target);
      $draggable.css({ left: 0, top: 0 });
    },

    onDragStart: function (e, ui) {
      if (!this.model.get("_isEnabled")) return;

      this.winHeight = this.$scrollElement.height();
      this.navHeight = $(".navigation").height();

      const fromDroppable = ui.helper.data("droppable");
      ui.helper.data("fromDroppable", fromDroppable);
      this.$(".dragndropwi__widget").addClass("dragging");
      this.$currentDraggable = ui.helper;
      this.$currentDraggable.removeClass("ui-state-placed");
    },

    onDrag: function (e, ui) {
      const top = ui.offset.top;
      const st = this.$scrollElement.scrollTop();
      const diff = st - top + this.navHeight;

      if (diff > 0) {
        this.dragScroll(-10, ui);
      } else if (st + this.winHeight < top + 50) {
        this.dragScroll(10, ui);
      } else if (this.isScrolling) {
        this.cancelDragScroll();
      }
    },

    dragScroll: function (increment, ui) {
      if (this.isScrolling) return;
      this.isScrolling = true;

      const $container = this.$(this.containerClass);
      const containerTop = $container.offset().top;
      const containerBottom = containerTop + $container.height();

      this.scrollInterval = setInterval(
        _.bind(function () {
          const st = this.$scrollElement.scrollTop();
          const top = ui.helper.offset().top;
          if (increment > 0) {
            if (
              top >= containerBottom ||
              st + this.winHeight >= containerBottom
            ) {
              this.cancelDragScroll();
            }
          } else {
            if (
              top <= containerTop - this.navHeight ||
              st <= containerTop - this.navHeight
            ) {
              this.cancelDragScroll();
            }
          }
          ui.helper.css({ top: "+=" + increment });
          this.$scrollElement.scrollTop(st + increment);
        }, this),
        32
      );
    },

    cancelDragScroll: function () {
      this.isScrolling = false;
      clearInterval(this.scrollInterval);
    },

    onDragStop: function (e, ui) {
      this.$(".dragndropwi__widget").removeClass("dragging");
      this.$(".ui-state-hover").removeClass("ui-state-hover");

      const fromDroppable = ui.helper.data("fromDroppable");
      if (fromDroppable && fromDroppable !== this.$currentDroppable) {
        fromDroppable
          .removeClass("ui-state-disabled")
          .removeClass("nomorespace")
          .addClass("ui-state-enabled")
          .removeData();
      }

      if (
        !this.$currentDroppable ||
        this.$currentDroppable.is(".ui-state-disabled")
      ) {
        this.resetDraggable();
        return;
      }

      setTimeout(function () {
        ui.helper.addClass("ui-draggable-dragging");
      }, 2);
      setTimeout(function () {
        ui.helper.removeClass("ui-draggable-dragging");
      }, this.animationTime);

      const userAnswer = this.$currentDraggable.text();
      this.$currentDroppable.data("userAnswer", userAnswer);
      const $question = this.$currentDroppable.parents();
      const $children = $question.children(".ui-droppable");
      const questionIndex = $question.index();
      const numAnswers = $children.length;
      const item = this.model.get("_items")[questionIndex];

      if (numAnswers > 1) {
        item._userAnswer = _.map($children, function (droppable) {
          return $(droppable).data("userAnswer");
        });
      } else {
        item._userAnswer = [userAnswer];
      }

      this.placeDraggable(this.$currentDraggable, this.$currentDroppable, 200);
      this.storeUserAnswer();
    },

    onDropOut: function (e, ui) {
      $(e.target).removeClass("ui-state-hover");
      const $droppable = this.$currentDraggable.data("droppable");
      if ($droppable) {
        $droppable
          .removeClass("ui-state-disabled")
          .removeClass("nomorespace")
          .addClass("ui-state-enabled");
      }

      if (this.$currentDroppable && e.target === this.$currentDroppable[0]) {
        this.$currentDraggable.data("droppable", null);
        this.$currentDroppable = null;
      }
    },

    onDropOver: function (e, ui) {
      const $target = $(e.target);
      if ($target.is(".ui-state-disabled")) return;
      if (this.$currentDroppable) {
        this.$currentDroppable.removeClass("ui-state-hover");
      }
      $target.addClass("ui-state-hover");
      this.$currentDroppable = $target;
    },

    placeDraggable: function ($draggable, $droppable, animationTime) {
      if (typeof animationTime !== "number") animationTime = this.animationTime;
      const animationClass = "dragndrop-transition-" + animationTime;

      $draggable.removeClass("ui-state-placed").addClass(animationClass);
      // .offset($droppable.offset());
      $droppable
        .removeClass("ui-state-enabled")
        .addClass("ui-state-disabled")
        .data("answer", $draggable.text());

      const that = this;
      setTimeout(function () {
        $draggable
          .toggleClass("ui-state-placed " + animationClass)
          .data("droppable", $droppable);
      }, animationTime);

      this.queue = setTimeout(function () {
        that.$currentDroppable = null;
      }, animationTime);

      const component_id = this.model.get("_id");
      const items = this.model.get("_items");

      _.each(items, function (item, i) {
        const uniqueitem = $(
          '.dragndropwithimage[data-adapt-id="' +
            component_id +
            '"] .dragndropwi__inner .dragndropwi-question[data-index="' +
            i +
            '"] .ui-state-disabled'
        );
        const uniqueitemnum = uniqueitem.length;
        const accepted = item.accepted.length;

        if (uniqueitemnum == accepted) {
          uniqueitem.addClass("nomorespace");
          uniqueitem.last().css("opacity", "0.9");
        }
      });

      /// /////////////////// BOUNCE BACK BELOW HERE /////////////////////////////////////////
      // var bounceBack = this.model.get("_bounceBack");

      if (
        this.bounceBack == true ||
        $(
          '.dragndropwithimage[data-adapt-id="' +
            component_id +
            '"] .dragndropwi__inner .btn__container'
        ).hasClass("bounceback")
      ) {
        const getindex = $droppable.attr("data-index");
        // console.log("GET INDEX: " + getindex);

        const myitem0 = items[getindex].accepted[0].src;
        const myuser0 = items[getindex]._userAnswer;
        if (myuser0 == myitem0) {
          setTimeout(function () {
            $(
              '.dragndropwithimage[data-adapt-id="' +
                component_id +
                '"] .dragndropwi__inner .dragndropwi-question[data-index="' +
                getindex +
                '"]'
            ).addClass("correct");
            $(
              '.dragndropwithimage[data-adapt-id="' +
                component_id +
                '"] .dragndropwi__inner .dragndropwi-answer[name="' +
                myuser0 +
                '"]'
            ).remove();
            $(
              '.dragndropwithimage[data-adapt-id="' +
                component_id +
                '"] .dragndropwi__inner .dragndropwi-question[data-index="' +
                getindex +
                '"] .ui-state-disabled[data-index="' +
                getindex +
                '"]'
            ).removeAttr("data-index");
          }, animationTime);
          this.popupCorrect();
        } else {
          setTimeout(function () {
            $(
              '.dragndropwithimage[data-adapt-id="' +
                component_id +
                '"] .dragndropwi__inner .dragndropwi-question[data-index="' +
                getindex +
                '"] .dragndropwi-droppable'
            )
              .removeClass("ui-state-disabled")
              .removeClass("nomorespace")
              .addClass("ui-state-enabled");
            $(
              '.dragndropwithimage[data-adapt-id="' +
                component_id +
                '"] .dragndropwi__inner .dragndropwi-answer[name="' +
                myuser0 +
                '"]'
            )
              .animate($draggable.data().originalPosition, animationTime)
              .removeClass("ui-state-placed")
              .data("droppable", null);
          }, animationTime);
          this.popupIncorrect();
        }
      } else {
        // No BounceBack
      }

      /// /////////////////// BOUNCE BACK ABOVE HERE /////////////////////////////////////////
    },

    popupCorrect: function () {
      this.model.set("_active", false);
      const countenabled = this.$(".ui-state-enabled").length;
      const bodyText = this.model.get("_feedback").correct;
      const titleText = this.model.get("title");

      const popupObject = {
        title: titleText,
        body: bodyText,
      };
      Adapt.notify.popup(popupObject);

      if (countenabled === 0) {
        this.setCompletionStatus();
      }
    },
    popupIncorrect: function () {
      this.model.set("_active", false);
      const bodyText2 = this.model.get("_feedback")._incorrect.notFinal;
      const titleText2 = this.model.get("title");

      const popupObject2 = {
        title: titleText2,
        body: bodyText2,
      };
      Adapt.notify.popup(popupObject2);
    },

    resetDraggable: function ($draggable, position, animationTime) {
      $draggable = $draggable || this.$currentDraggable;
      position = position || $draggable.data().originalPosition;
      if (animationTime === undefined) animationTime = this.animationTime;
      if ($draggable.data("droppable")) {
        $draggable.data("droppable").addClass("ui-state-enabled");
      }

      $draggable
        .animate(position, animationTime)
        .removeClass("ui-state-placed")
        .data("droppable", null);
    },

    /** ************************************ QUESTION METHODS **************************************/

    canSubmit: function () {
      return this.$(".ui-state-enabled").length === 0;
    },

    showMarking: function () {
      _.each(
        this.model.get("_items"),
        function (item, i) {
          const $question = this.$(".dragndropwi-question").eq(i);
          $question
            .removeClass("correct incorrect")
            .addClass(item._isCorrect ? "correct" : "incorrect");
        },
        this
      );
    },

    isCorrect: function () {
      this.markAnswers();

      // do we have any _isCorrect == false?
      return !_.contains(
        _.pluck(this.model.get("_items"), "_isCorrect"),
        false
      );
    },

    markAnswers: function () {
      let numberOfCorrectAnswers = 0;
      const myownid = this.model.get("_id");
      this.model.set("_isAtLeastOneCorrectSelection", false);
      _.each(
        this.model.get("_items"),
        function (item) {
          let answers = [];

          _.each(
            item.accepted,
            function (mraccepted) {
              const checkaccepted = mraccepted.src;

              answers = answers.concat(checkaccepted); // Combines multiple answers?

              $(
                '.dragndropwithimage[data-adapt-id="' +
                  myownid +
                  '"] .dragndropwi__inner .dragndropwi-item[name*="' +
                  checkaccepted +
                  '"]'
              )
                .addClass("dragcharm")
                .text("For \n" + item.text);

              item._isCorrect =
                answers.sort().join() === item._userAnswer.sort().join();

              if (item._isCorrect) {
                numberOfCorrectAnswers++;
                this.model.set(
                  "_numberOfCorrectAnswers",
                  numberOfCorrectAnswers
                );
                this.model.set("_isAtLeastOneCorrectSelection", true);
              }
            },
            this
          );
        },
        this
      );
    },

    resetQuestion: function () {
      this.$(".dragndropwi-question").removeClass("correct incorrect");
      this.$(".ui-droppable")
        .removeClass("ui-state-disabled")
        .removeClass("nomorespace");
      const myownid = this.model.get("_id");

      _.each(
        this.$(".ui-state-placed"),
        function (draggable) {
          this.resetDraggable($(draggable));
        },
        this
      );

      _.each(this.model.get("_items"), function (item, i) {
        item._isCorrect = false;

        _.each(item.accepted, function (mraccepted) {
          const accepted = mraccepted.src;

          $(
            '.dragndropwithimage[data-adapt-id="' +
              myownid +
              '"] .dragndropwi__inner .dragndropwi-item[name*="' +
              accepted +
              '"]'
          )
            .removeClass("dragcharm")
            .text(accepted);
        });
      });
    },

    hideCorrectAnswer: function () {
      this.showAnswer(true);
    },

    showCorrectAnswer: function () {
      this.showAnswer();
    },

    disableButtonActions: function (val) {
      this.$(".btn__action").prop("disabled", val);
    },

    showAnswer: function (showUserAnswer) {
      const $droppables = this.$(".ui-droppable");
      const context = this;
      this.disableButtonActions(true);

      if (!$droppables.length) return; // Necessary as method is automatically called before drag and drop elements are rendered
      setTimeout(function () {
        context.disableButtonActions(false);
      }, this.model.get("animationTime") || 300);

      if (!$droppables.length) return; // Necessary as method is automatically called before drag and drop elements are rendered
      const items = this.model.get("_items");
      const countdummy = this.model.get("dummyAnswers").length;
      console.log(items, this.model.get("dummyAnswers"));

      if (countdummy == 1) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
      } else if (countdummy == 2) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
      } else if (countdummy == 3) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
        var dummyAnswers2 = this.model.get("dummyAnswers")[2].src || [];
      } else if (countdummy == 4) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
        var dummyAnswers2 = this.model.get("dummyAnswers")[2].src || [];
        var dummyAnswers3 = this.model.get("dummyAnswers")[3].src || [];
      } else if (countdummy == 5) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
        var dummyAnswers2 = this.model.get("dummyAnswers")[2].src || [];
        var dummyAnswers3 = this.model.get("dummyAnswers")[3].src || [];
        var dummyAnswers4 = this.model.get("dummyAnswers")[4].src || [];
      } else if (countdummy == 6) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
        var dummyAnswers2 = this.model.get("dummyAnswers")[2].src || [];
        var dummyAnswers3 = this.model.get("dummyAnswers")[3].src || [];
        var dummyAnswers4 = this.model.get("dummyAnswers")[4].src || [];
        var dummyAnswers5 = this.model.get("dummyAnswers")[5].src || [];
      } else if (countdummy == 7) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
        var dummyAnswers2 = this.model.get("dummyAnswers")[2].src || [];
        var dummyAnswers3 = this.model.get("dummyAnswers")[3].src || [];
        var dummyAnswers4 = this.model.get("dummyAnswers")[4].src || [];
        var dummyAnswers5 = this.model.get("dummyAnswers")[5].src || [];
        var dummyAnswers6 = this.model.get("dummyAnswers")[6].src || [];
      } else if (countdummy == 8) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
        var dummyAnswers2 = this.model.get("dummyAnswers")[2].src || [];
        var dummyAnswers3 = this.model.get("dummyAnswers")[3].src || [];
        var dummyAnswers4 = this.model.get("dummyAnswers")[4].src || [];
        var dummyAnswers5 = this.model.get("dummyAnswers")[5].src || [];
        var dummyAnswers6 = this.model.get("dummyAnswers")[6].src || [];
        var dummyAnswers7 = this.model.get("dummyAnswers")[7].src || [];
      } else if (countdummy == 9) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
        var dummyAnswers2 = this.model.get("dummyAnswers")[2].src || [];
        var dummyAnswers3 = this.model.get("dummyAnswers")[3].src || [];
        var dummyAnswers4 = this.model.get("dummyAnswers")[4].src || [];
        var dummyAnswers5 = this.model.get("dummyAnswers")[5].src || [];
        var dummyAnswers6 = this.model.get("dummyAnswers")[6].src || [];
        var dummyAnswers7 = this.model.get("dummyAnswers")[7].src || [];
        var dummyAnswers8 = this.model.get("dummyAnswers")[8].src || [];
      } else if (countdummy == 10) {
        var dummyAnswers0 = this.model.get("dummyAnswers")[0].src || [];
        var dummyAnswers1 = this.model.get("dummyAnswers")[1].src || [];
        var dummyAnswers2 = this.model.get("dummyAnswers")[2].src || [];
        var dummyAnswers3 = this.model.get("dummyAnswers")[3].src || [];
        var dummyAnswers4 = this.model.get("dummyAnswers")[4].src || [];
        var dummyAnswers5 = this.model.get("dummyAnswers")[5].src || [];
        var dummyAnswers6 = this.model.get("dummyAnswers")[6].src || [];
        var dummyAnswers7 = this.model.get("dummyAnswers")[7].src || [];
        var dummyAnswers8 = this.model.get("dummyAnswers")[8].src || [];
        var dummyAnswers9 = this.model.get("dummyAnswers")[9].src || [];
      }

      const userAnswers = _.flatten(_.pluck(items, "_userAnswer"));
      const usedDroppables = [];
      const toReset = [];
      const toPlace = [];
      const toMove = [];

      _.each(
        items,
        function (item, i) {
          const $question = this.$(".dragndropwi-question").eq(i);
          let answers = [];

          _.each(
            item.accepted,
            function (mraccepted) {
              const checkaccepted = mraccepted.src;

              answers = answers.concat(checkaccepted); // Combines multiple answers?

              answers.sort();
              item._userAnswer.sort();

              if (item._userAnswer.join() !== answers.join()) {
                const itemUserAnswers = _.difference(item._userAnswer, answers);
                const acceptedAnswers = _.difference(answers, item._userAnswer);

                const difference = userAnswers.concat(acceptedAnswers);

                _.each(
                  itemUserAnswers,
                  function (userAnswer, j) {
                    const answerPlace = showUserAnswer
                      ? userAnswer
                      : acceptedAnswers[j];
                    const answerReset = showUserAnswer
                      ? acceptedAnswers[j]
                      : userAnswer;

                    const droppable = _.find(
                      $question.children(".ui-droppable"),
                      function (droppable) {
                        const answer = $(droppable).data().answer;
                        if (usedDroppables.indexOf(droppable) > -1) {
                          return false;
                        }
                        usedDroppables.push(droppable);
                        return (
                          (!showUserAnswer && answers.indexOf(answer) === -1) ||
                          (showUserAnswer &&
                            item._userAnswer.indexOf(answer) === -1)
                        );
                      }
                    );
                    const $droppable = $(droppable);
                    placeDraggables(answerPlace, answerReset, $droppable, this);
                  },
                  this
                );
              }
            },
            this
          );
        },
        this
      );

      const draggables = toReset.concat(toMove, toPlace);

      _.each(
        draggables,
        function ($, i) {
          const delay = this.animationDelay;
          const t = i * delay;
          const that = this;
          setTimeout(function () {
            $.drop
              ? that.placeDraggable($.drag, $.drop, 600)
              : that.resetDraggable($.drag, null, 600);
          }, t);
        },
        this
      );

      function placeDraggables(answerPlace, answerReset, $droppable, instance) {
        const $draggablePlace = instance.getDraggableByText(answerPlace);
        const $draggableReset = instance.getDraggableByText(answerReset);

        if (countdummy == 1) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1);
        } else if (countdummy == 2) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1);
        } else if (countdummy == 3) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers2.indexOf(answerReset) > -1);
        } else if (countdummy == 4) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers2.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers3.indexOf(answerReset) > -1);
        } else if (countdummy == 5) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers2.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers3.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers4.indexOf(answerReset) > -1);
        } else if (countdummy == 6) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers2.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers3.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers4.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers5.indexOf(answerReset) > -1);
        } else if (countdummy == 7) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers2.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers3.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers4.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers5.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers6.indexOf(answerReset) > -1);
        } else if (countdummy == 8) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers2.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers3.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers4.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers5.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers6.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers7.indexOf(answerReset) > -1);
        } else if (countdummy == 9) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers2.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers3.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers4.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers5.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers6.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers7.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers8.indexOf(answerReset) > -1);
        } else if (countdummy == 10) {
          var isReset =
            (showUserAnswer && userAnswers.indexOf(answerReset) === -1) ||
            (!showUserAnswer && dummyAnswers0.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers1.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers2.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers3.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers4.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers5.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers6.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers7.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers8.indexOf(answerReset) > -1) ||
            (!showUserAnswer && dummyAnswers9.indexOf(answerReset) > -1);
        }

        $draggablePlace.hasClass("ui-state-placed")
          ? toMove.push({ drag: $draggablePlace, drop: $droppable })
          : toPlace.push({ drag: $draggablePlace, drop: $droppable });
        if (isReset) toReset.push({ drag: $draggableReset });
      }

      // this.$(".dragndropwi-question").each((index) => {
      //   const accepted = `<div>Hehe${index}</div>`;
      //   $(this).append(accepted);
      //   console.log(this, $(this));
      // });

      if (!showUserAnswer) {
        _.each(
          this.$(".dragndropwi-question"),
          function (question, index) {
            const $container = $(
              '<div class="accepted-answer" style="padding: 10px; display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; gap: 10px;"></div>'
            );
            const imageSources = items[parseInt(index)].accepted.map(
              (item) => item.src
            );

            imageSources.forEach((src, index) => {
              const $img = $("<img />").attr("src", src);

              const $imgContainer = $(
                "<div style='max-width: 188px; height: fit-content;'></div>"
              );
              $imgContainer.append($img);
              $container.append($imgContainer);
            });

            $(question).append($container);
          },
          this
        );
        this.$(".dragndropwi-answers").css("visibility", "hidden");
      } else {
        _.each(
          this.$(".dragndropwi-question"),
          function (question, index) {
            $(question).find(".accepted-answer").remove();
          },
          this
        );
        this.$(".dragndropwi-answers").css("visibility", "visible");
      }
    },

    storeUserAnswer: function () {
      const answers = this.getAnswers(true);
      const $droppables = this.$(".ui-droppable");
      const userAnswers = _.map($droppables, function (droppable, i) {
        const answer = $droppables.eq(i).data("userAnswer");
        return answers.indexOf(answer);
      });

      this.model.set("_userAnswer", userAnswers);
    },

    setScore: function () {
      const numberOfCorrectAnswers =
        this.model.get("_numberOfCorrectAnswers") || 0;
      const questionWeight = this.model.get("_questionWeight");
      const itemLength = this.model.get("_items").length;
      const items = this.model.get("_items");

      const score = (questionWeight * numberOfCorrectAnswers) / itemLength;

      let _score = 0;
      let _maxScore = 0;

      items.forEach((item) => {
        const { accepted, _userAnswer } = item;
        const _acceptedSrc = accepted.map((item) => item.src);

        _score += _.intersection(_acceptedSrc, _userAnswer).length;
        _maxScore += _acceptedSrc.length;
      });

      this.model.set("_score", score);
      this.$(".dragndropwi-score")
        .html(`${_score}/${_maxScore}`)
        .css("color", _score === _maxScore ? "green" : "red");
    },

    disableQuestion: function () {
      this.$(".dragndropwi-answers").children().draggable("disable");
    },

    enableQuestion: function () {
      this.$(".dragndropwi-answers").children().draggable("enable");
    },
  });

  // Adapt.register("dragndropwithimage", dragndropwithimage);

  return DragndropwithimageView;
});
