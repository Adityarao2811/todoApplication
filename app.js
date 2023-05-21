/*
 *  Created a Table with name todo in the todoApplication.db file using the CLI.
 */
const datefns = require("date-fns");

const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const priorityValues = ["HIGH", "MEDIUM", "LOW", ""];
const statusValues = ["TO DO", "IN PROGRESS", "DONE", ""];
const categoryValues = ["WORK", "HOME", "LEARNING", ""];

app.get("/todos/", async (request, response) => {
  let data = null;
  const {
    search_q = "",
    priority = "",
    status = "",
    category = "",
  } = request.query;
  if (priorityValues.includes(priority)) {
    if (statusValues.includes(status)) {
      if (categoryValues.includes(category)) {
        const getTodosQuery = `
                SELECT
                    id,
                    todo,
                    priority,
                    status,
                    category,
                    due_date as dueDate 
                FROM
                    todo 
                WHERE
                    todo LIKE '%${search_q}%'
                    AND status LIKE '%${status}%'
                    AND priority LIKE '%${priority}%'
                    AND category LIKE'%${category}%';`;

        data = await database.all(getTodosQuery);
        response.send(data);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
            id,
            todo,
            priority,
            status,
            category,
            due_date as dueDate 
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(todo);
});

app.get("/agenda/", async (request, response) => {
  let data = null;
  const { date } = request.query;

  if (datefns.isValid(new Date(date))) {
    dueDate = datefns.format(
      datefns.parse(date, "yyyy-MM-dd", new Date()),
      "yyyy-MM-dd"
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
    return;
  }

  const getTodosQuery = `
                SELECT
                    id,
                    todo,
                    priority,
                    status,
                    category,
                    due_date as dueDate 
                FROM
                    todo 
                WHERE
                   due_date = '${date}';`;

  data = await database.all(getTodosQuery);
  response.send(data);
});

app.post("/todos/", async (request, response) => {
  let { id, todo, priority, status, category, dueDate } = request.body;

  if (!priorityValues.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
    return;
  }

  if (!categoryValues.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
    return;
  }

  if (!statusValues.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
    return;
  }

  if (datefns.isValid(new Date(dueDate))) {
    dueDate = datefns.format(
      datefns.parse(dueDate, "yyyy-MM-dd", new Date()),
      "yyyy-MM-dd"
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
    return;
  }

  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status,category,due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}','${category}','${dueDate}');`;
  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  let requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      if (!statusValues.includes(requestBody.status)) {
        response.status(400);
        response.send("Invalid Todo Status");
        return;
      }
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      if (!priorityValues.includes(requestBody.priority)) {
        response.status(400);
        response.send("Invalid Todo Priority");
        return;
      }
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      if (!categoryValues.includes(requestBody.category)) {
        response.status(400);
        response.send("Invalid Todo Category");
        return;
      }
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      if (datefns.isValid(new Date(requestBody.dueDate))) {
        requestBody.dueDate = datefns.format(
          datefns.parse(requestBody.dueDate, "yyyy-MM-dd", new Date()),
          "yyyy-MM-dd"
        );
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }

      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date='${dueDate}'
    WHERE
      id = ${todoId};`;

  const db = await database.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
