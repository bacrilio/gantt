/* global Snap, moment */

import './styles.scss';

var frappegantt = require('frappe-gantt');

export default function index(container, tasks, config) {

	var self = {};

	const cols = [40, 130, 100, 65, 65];

	const statuses = {
		0: 'беклог',
		1: 'оценка',
		2: 'ожидает',
		3: 'оценено',
		4: 'план',
		5: 'в работе',
		6: 'проверка',
		7: 'закрыто',
		8: 'в архиве'
	};

	const priority = {
		low: 'low',
		normal: 'normal',
		high: 'high'
	};

	function init() {
		prepareTasks();
		prepareContainer();
		render_gantt();
		render_legend();
		render_menu();
	}

	function prepareTasks() {
		let groups = {};
		let ids = [];
		tasks.map((task) => {
			if(task) {
				task.id = task.id.toString();
				ids.push(task.id);
			}
		});
		tasks.map((task) => {
			if(task) {
				task.developer = task.developer || task.performer_user;
				task.manager = task.manager || task.creator_user;
				task.status = statuses.hasOwnProperty(task.status) ? statuses[task.status] : task.status;
				task.name = task.title;
				task.progress = task.progress || 0;
				if(task.parent_id) {
					const parent_id = task.parent_id.toString();
					if(ids.indexOf(parent_id) > -1) {
						task.dependencies = parent_id;
					}
				}
				const start = task.start_time || task.created_at;
				task.start = moment(start);
				task.end = moment(task.deadline);
				if(task.end < task.start) {
					const created_at = moment(task.created_at);
					if(task.start_time && task.end > created_at) {
						task.start = created_at;
					} else {
						delete task.start;
						delete task.end;
						task.error = 'Срок окончания задачи раньше чем срок начала выполнения.';
					}
				}

				if(task.developer) {
					if(!groups.hasOwnProperty(task.developer)) {
						groups[task.developer] = [];
					}
					groups[task.developer].push(task);
					delete task.developer;
				} else {
					if(!groups.hasOwnProperty('Без разработчика')) {
						groups['Без разработчика'] = [];
					}
					groups['Без разработчика'].push(task);
				}
			}
		});

		tasks.length = 0;

		for (let key in groups) {
			// tasks.push({developer: key, header: 1});
			tasks = tasks.concat(groups[key]);
		}

		console.log(tasks);
	}

	function prepareContainer() {
		let html = '<div style="float: left"><svg id="legend" width="200" height="200"></svg></div>';
		html = html + '<div style="overflow: scroll"><svg id="gantt" width="200" height="200"></svg></div>';
		document.getElementById(container).innerHTML = html;
	}

	function render_gantt(view_mode = 'Day') {
		if(!config) {
			config = {};
		}
		config.view_mode = view_mode;
		self.gannt = frappegantt('#gantt', tasks, config);
	}

	function render_legend() {
		self.canvas = Snap('#legend');

		self.bg = self.canvas.group();
		self.grids = self.canvas.group();
		self.headers = self.canvas.group();
		self.projects = self.canvas.group();
		self.managers = self.canvas.group();
		self.status = self.canvas.group();
		self.time = self.canvas.group();
		self.error = self.canvas.group();
		self.url = self.canvas.group();

		const pos0 = 10;
		const pos1 = pos0 + cols[0];
		const pos2 = pos1 + cols[1];
		const pos3 = pos2 + cols[2];
		const pos4 = pos3 + cols[3];

		const all_width = pos4 + cols[4] - 10;

		tasks.map((task, index) => {
			let yy = 83 + index * 38;
			let fill_y = yy - 24;
			if(index % 2) {
				self.canvas.rect(5, fill_y, all_width, 38).addClass('bg_row').appendTo(self.grids);
			}
			if(task.developer) {
				self.canvas.rect(5, fill_y, all_width, 38).addClass('bg_header').appendTo(self.headers);
				self.canvas.text(pos0, yy, fittingString(task.developer, 1, all_width))
					.addClass('developer').appendTo(self.developer);
			} else {
				const _priority = (priority.hasOwnProperty(task.priority)) ? priority[task.priority] : 'normal';
				let btn = self.canvas.circle(pos0 + cols[0] / 2 - 5, yy - 5, 11).addClass(_priority).appendTo(self.url);
				const url = 'http://troppus.itech-group.ru/tickets/'.concat(task.id);
				btn.node.addEventListener('click', (evt) => {
					window.open(url, '_blank');
				}, false);
			}
			if(task.project) {
				self.canvas.text(pos1, yy, fittingString(task.project, 0, cols[1]))
					.addClass('label').appendTo(self.projects);
			}
			if(task.manager) {
				self.canvas.text(pos2, yy, fittingString(task.manager, 0, cols[2]))
					.addClass('label').appendTo(self.managers);
			}
			if(task.status) {
				self.canvas.text(pos3, yy, fittingString(task.status, 0, cols[3]))
					.addClass('label').appendTo(self.status);
			}
			if(task.time) {
				let time = moment({hours: 0, minutes: 0}).add(task.time, 'minutes').format('HH:mm');
				if(task.time > 1440) {
					time = (Math.floor(task.time / 1440)).toString().concat(' ', time);
				}
				self.canvas.text(pos4, yy, fittingString(time, 0, cols[4]))
					.addClass('label').appendTo(self.time);
			}
			if(task.error) {
				let btn = self.canvas.rect(5, fill_y, all_width, 38).addClass('error').appendTo(self.error);
				btn.node.addEventListener('click', (evt) => {
					alert(task.error);
				}, false);
			}
		});

		self.canvas.text(-5 + pos0 + cols[0] / 2, 50, fittingString('URL', 1, cols[0]))
			.addClass('header').appendTo(self.projects);
		self.canvas.text(-5 + pos1 + cols[1] / 2, 50, fittingString('Проект', 1, cols[1]))
			.addClass('header').appendTo(self.projects);
		self.canvas.text(-5 + pos2 + cols[2] / 2, 50, fittingString('Менеджер', 1, cols[2]))
			.addClass('header').appendTo(self.managers);
		self.canvas.text(-5 + pos3 + cols[3] / 2, 50, fittingString('Статус', 1, cols[3]))
			.addClass('header').appendTo(self.status);
		self.canvas.text(-5 + pos4 + cols[4] / 2, 50, fittingString('Оценка', 1, cols[4]))
			.addClass('header').appendTo(self.time);

		const clientHeight = self.gannt.canvas.node.clientHeight;

		self.canvas.rect(0, 0, all_width + 10, clientHeight).addClass('bg').appendTo(self.bg);
		self.canvas.line(pos1 - 5, 32, pos1 - 5, clientHeight - 20).addClass('grid').appendTo(self.grids);
		self.canvas.line(pos2 - 5, 32, pos2 - 5, clientHeight - 20).addClass('grid').appendTo(self.grids);
		self.canvas.line(pos3 - 5, 32, pos3 - 5, clientHeight - 20).addClass('grid').appendTo(self.grids);
		self.canvas.line(pos4 - 5, 32, pos4 - 5, clientHeight - 20).addClass('grid').appendTo(self.grids);

		self.canvas.attr({
			height: clientHeight,
			width: all_width + 15
		});
	}

	function fittingString(str, header = 0, maxWidth = 100) {
		let ctx = document.createElement('canvas').getContext('2d');
		ctx.font = header ? 'bold 14px sans-serif' : 'normal 12px sans-serif';
		let width = ctx.measureText(str).width;
		let ellipsis = '…';
		let ellipsisWidth = ctx.measureText(ellipsis).width;
		maxWidth = maxWidth - 10;
		if (!(width <= maxWidth || width <= ellipsisWidth)) {
			let len = str.length;
			while (width >= maxWidth - ellipsisWidth && len-- > 0) {
				str = str.substring(0, len);
				width = ctx.measureText(str).width;
			}
			return str + ellipsis;
		}
		return str;
	}

	function render_menu() {
		self.btns = self.canvas.group();

		const all_width = cols[0] + cols[1] + cols[2] + cols[3] + cols[4];
		const pos = (all_width - 300) / 2;

		const view_modes = ['Day', 'Week', 'Month'];
		self.canvas.rect(5, 5, all_width, 24).addClass('bg_header').appendTo(self.btns);
		view_modes.map((menu, index) => {
			self.canvas.text(pos + 55 + index * 100, 21, menu).addClass('menu').appendTo(self.btns);
			let btn = self.canvas.rect(pos + 7 + index * 100, 7, 96, 20)
				.addClass(index ? 'timebtn' : 'timebtn activebtn').appendTo(self.btns);
			btn.node.addEventListener('click', (evt) => {
				self.canvas.selectAll('.activebtn').forEach(el => {
					el.removeClass('activebtn');
				});
				btn.addClass('activebtn');
				render_gantt(menu);
			}, false);
		});
	}

	init();

	return self;
}
