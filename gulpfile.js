"use strict";

/* -- Подключение модулей  -- */

/* Подключение gulp таск-раннера */
var gulp = require("gulp");

/* Подключение SASS-препроцессора */
var sass = require("gulp-sass");

var sourcemaps = require("gulp-sourcemaps");

/* Запирает все ошибки в себя, не останавливая работу скрипта */
var plumber = require("gulp-plumber");

/* POSTCSS c автопрефиксером */
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");

/* Модуль, отображающий изменения в браузере на лету */
var server = require("browser-sync").create();
var reload = server.reload;

/* Минификация HTML */
var htmlmin = require("gulp-htmlmin");

/* Минификация CSS */
var cleanCSS = require("gulp-clean-css");

/* Минификация JS */
var uglify = require("gulp-uglify");

/* Плагин для переименования файла */
var rename = require("gulp-rename");

/* Оптимизация изображений */
var imagemin = require("gulp-imagemin");

/* Конвертация изображений в Webp для браузеров на основе движка blink */
var webp = require("gulp-webp");

/* Сборка SVG-спрайтов */
var svgstore = require("gulp-svgstore");

/* Плагин для последовательного запуска задач друг за другом.
Позволяет дождаться результата одного таска, затем запускает следующий */
var run = require("run-sequence");

/* Модуль для удаления файлов */
var del = require("del");

/* POSTHTML для минификации HTML с плагином для вставки
других файлов в HTML файл с помощью <include src=""></include> */
var posthtml = require("gulp-posthtml");
var include = require("posthtml-include");


/* -- Задачи  -- */


/* Минифицирует HTML */
gulp.task("html", function() {  /* Название таски*/
  return gulp.src("./source/*.html")  /* Место, где лежат исходные файлы */
    .pipe(posthtml([
      include()  /* Конвертирует все <include></include> */
    ]))
    .pipe(htmlmin({  /* Минификация HTML*/
      collapseWhitespace: true,
      ignoreCustomFragments: [ /<br>\s/gi ]  /* Не убираем пробел после <br> */
    }))
    .pipe(gulp.dest("./build"))  /* Место выгрузки файлов для продакшена */
    .pipe(server.stream());  /* Перезагрузка сервера в браузере */
});

/* Собираем стили: компилируем из scss, расставляем префиксы, минифицируем,
 переименовываем */
gulp.task("style", function() {
  gulp.src("./source/sass/style.scss")
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(postcss([
      autoprefixer()
    ]))
    .pipe(cleanCSS({compatibility: 'ie8'}))
    /*.pipe(csso({
      restructure: false,  /!*Отключаем смешивание общих стилей *!/
      sourceMap: true
    }))*/
    .pipe(rename("style.min.css"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./build/css"))
    .pipe(server.stream());
});

/* Минифицирует скрипты */
gulp.task("scripts", function () {
  return gulp.src("source/js/**/*.js")
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(rename({suffix: ".min"}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("build/js"))
    .pipe(server.stream());
});

/* Минифицирует изображения*/
gulp.task("images", function() {
  return gulp.src("./source/img/**/*.{png,jpg,svg}")
    .pipe(imagemin([  /* Плагин для работы с png, svg, jpg */
      imagemin.optipng({optimizationLevel: 3}),  /* 1 - максимальное сжатие, 3 - безопасное сжатие, 10 - без сжатия */
      imagemin.jpegtran({progressive: true}),  /* Прогрессивная загрузка jpg */
      imagemin.svgo()   /* Минификация svg */
      ]))
    .pipe(gulp.dest("./build/img"));
});

/* Конвертация в webp */
gulp.task("webp", function() {
  return gulp.src("./build/img/towebp/**/*.{png,jpg}")
    .pipe(webp({quality: 90})) /* Конвертируем png/jpg в webp с легкой потерей качества изображения */
    .pipe(gulp.dest("./build/img"));
});

/* Сборка спрайта SVG */
gulp.task("sprite", function() {
  return gulp.src("./build/img/inline-icons/*.svg")
    .pipe(svgstore({/* Делает спрайт из SVG-файлов */
      inLineSvg: true
    }))
     .pipe(imagemin([
      imagemin.svgo()
      ]))
    .pipe(rename("sprite.svg"))
    .pipe(gulp.dest("./build/img"));
});

/* Таск для копирования */
gulp.task("copy", function() {
  return gulp.src([
  "./source/fonts/**/*.{woff,woff2}"/*,
  "./source/img/**"*/
  ], {
    base: "./source/"  /* Указание базового пути из корня */
  })
  .pipe(gulp.dest("build"));
});

/* Таск для удаления прошлой сборки */
gulp.task("clean", function() {
  return del("build");
});

/* Удаление всех изображений */
gulp.task("clean-images", function() {
  return del("./build/img/**/*.{png,jpg,svg,webp}");
});

/* Запуск всех тасков работы с изображениями */
gulp.task("images-watch", function() {
  run(
    "clean-images",
    "images",
    "webp",
    "sprite",
    "html"  /* Перезагрузка страницы*/
    );
});

/* Таск компиляции всего проекта (npm run build) */
gulp.task("build", function(done) {
  run(
    "clean",
    "copy",
    "style",
    "scripts",
    "images",
    "webp",
    "sprite",
    "html",
    done  /* Самым последним вызовом функции run должна быть функция, которая была передана как аргумент */
  );
});

/* Перед тем как таск serve стартует, должен быть запущен build.
gulp serve для запуска локального сервера */
gulp.task("serve", function() {
  server.init({  /* Инициирует сервер */
    server: "./build/",  /* Указываем, откуда смотреть сайт (. - текущий
     каталог) */
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  /* Вотчеры, следящие за изменениями файлов */
  /* Препроцессорные вотчеры (следим за всеми Sass-файлами во всех папках
     внутри папки sass), вторым аргументом передаем, какой таск нужно запустить,
     если один из файлов изменился */
  gulp.watch("source/sass/**/*.{scss,sass}", ["style"]);
  gulp.watch("source/*.html", ["html"]);
  gulp.watch("source/*.html").on("change", server.reload);
  gulp.watch("source/js/*.js", ["scripts"]);
  gulp.watch("source/img/**/*.{png,jpg,svg,webp}", ["images-watch"]);
});
